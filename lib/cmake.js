'use babel';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec }
from 'child_process';
import { EventEmitter }
from 'events';
import voucher from 'voucher';
import chokidar from 'chokidar';

export function providingFunction() {
    const generateErrorMatch = [
        "CMake Error at (?<file>[\\/0-9a-zA-Z\\._-]+):(?<line>\\d+)"
    ];
    const compileErrorMatch = [
        "(?<file>.+):(?<line>\\d+):(?<column>\\d+):\\s+error:\\s+(?<message>.+)",
        "(?<file>.+):(?<line>\\d+):(?<column>\\d+):\\s+fatal\\s+error:\\s+(?<message>.+)"
    ];
    return class CMakeBuildProvider extends EventEmitter {
        constructor(source_dir) {
            super();
            this.source_dir = source_dir;
            // TODO allow the build directory to be selected.
            this.build_dir = path.join(this.source_dir, "build");
            this.watcher = null;
        }

        destructor() {
            if(this.watch !== null)
                this.watcher.close();
        }

        getNiceName() {
            return 'cmake';
        }

        isEligible() {
            return fs.existsSync(path.join(this.source_dir, 'CMakeLists.txt'));
        }

        settings() {
            this.watcher = chokidar.watch(this.build_dir, {
                ignored: /^\./,
                persistent: true
            });

            this.watcher.on('change', path => {
                if(path.endsWith("CMakeCache.txt"))
                    this.emit('refresh');
            });

            const generateTarget = {
                atomCommandName : 'cmake:generate',
                name : 'generate',
                exec : 'cmake',
                cwd : this.source_dir,
                args : ['-B'+this.build_dir,'-H'+this.source_dir,'-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'],
                errorMatch:generateErrorMatch,
                sh : false
            };
            return voucher(exec, 'cmake --build ' + this.build_dir + ' --target help' , { cwd: this.build_dir })
            .then(output => {
                return [ generateTarget ].concat(output.toString('utf8')
                    .split(/[\r\n]{1,2}/)
                    .filter(line => line.startsWith('...'))
                    .map((line) => { return line.replace('... ','').split(' ')[0]; } )
                    .map(target => ({
                        atomCommandName : 'cmake:'+target,
                        name : target,
                        exec : 'cmake',
                        cwd : this.source_dir,
                        // TODO figure out witch build tool is being used and pass the right flags to enable multi-core build
                        args : [ '--build', this.build_dir], // for make add ['--', '-j'+os.cpus().length]
                        errorMatch : compileErrorMatch.concat(generateErrorMatch),
                        sh : false
                    })));
            }).catch(e => [ generateTarget ]);
        }
    };
}
