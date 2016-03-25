'use babel';

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import voucher from 'voucher';
import glob from 'glob';

export function providingFunction() {
    const generateErrorMatch = [
        "CMake Error at (?<file>[\\/0-9a-zA-Z\\._-]+):(?<line>\\d+)"
    ];
    const compileErrorMatch = [
        "(?<file>.+):(?<line>\\d+):(?<column>\\d+):\\s+(.*\\s+)?error:\\s+(?<message>.+)", // GCC/Clang Error
        "(.*>)?(?<file>.+)\\((?<line>\\d+)\\):\\s+(.*\\s+)?error\\s+(C\\d+):(?<message>.*)" // Visual Studio Error
    ];
    return class CMakeBuildProvider extends EventEmitter {
        constructor(source_dir) {
            super();
            this.source_dir = source_dir;
            // TODO allow the source directory to be selected.
            // TODO allow the build directory to be selected.
            this.build_dir = this.source_dir+"-build";
            this.cache_path = path.join(this.build_dir,'CMakeCache.txt');
        }

        destructor() {
        }

        getNiceName() {
            return 'cmake';
        }

        isEligible() {
            return fs.existsSync(path.join(this.source_dir, 'CMakeLists.txt')) || fs.existsSync(this.cache_path);
        }

        createVisualStudioTarget(target_name) {
            return {
                atomCommandName : 'cmake:'+target_name,
                name : target_name,
                exec : 'cmake',
                cwd : this.source_dir,
                args : [ '--build', this.build_dir, '--target',target_name,'--','/maxcpucount','/clp:NoSummary;ErrorsOnly;Verbosity=quiet'],
                errorMatch : compileErrorMatch.concat(generateErrorMatch),
                sh : false
            };
        }

        visualStudioTargets() {
            return Array.from(new Set(glob.sync("**/*.vcxproj", {cwd:this.build_dir, nodir:true, ignore:"CMakeFiles/**"})
            .map(target => path.basename(target, '.vcxproj'))))
            .map(target => this.createVisualStudioTarget(target))
            .concat([this.createVisualStudioTarget('clean')]);
        }

        createMakeFileTarget(target_name) {
            return {
                atomCommandName : 'cmake:'+target_name,
                name : target_name,
                exec : 'cmake',
                cwd : this.source_dir,
                args : [ '--build', this.build_dir, '--target',target_name,'--','-j'+os.cpus().length],
                errorMatch : compileErrorMatch.concat(generateErrorMatch),
                sh : false
            };
        }

        makeFileTargets() {
            output = execSync('cmake --build ' + this.build_dir + ' --target help' , { cwd: this.build_dir });
            return output.toString('utf8')
            .split(/[\r\n]{1,2}/)
            .filter(line => line.startsWith('...'))
            .map((line) => this.createMakeFileTarget(line.replace('... ','').split(' ')[0]));
        }

        settings() {
            fs.unwatchFile(this.cache_path);

            fs.watchFile(this.cache_path, (curr, prev) => {
                if(fs.existsSync(this.cache_path) && curr.mtime != prev.mtime)
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
            return voucher(fs.readFile, this.cache_path, { encoding: 'utf8' })
            .then(cache => {
                var generator = cache.match(/CMAKE_GENERATOR:INTERNAL=(.*)/)[1];
                if(generator.match('Visual Studio'))
                    return [ generateTarget ].concat(this.visualStudioTargets());
                else
                    return [ generateTarget ].concat(this.makeFileTargets());
            }).catch(e => {
                return [ generateTarget ];
            });
        }
    };
}
