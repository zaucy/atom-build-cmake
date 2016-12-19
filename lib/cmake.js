'use babel';

import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {execSync} from 'child_process';
import voucher from 'voucher';
import glob from 'glob';

export const config = require('./config');

export function providingFunction()
{
    const generateErrorMatch = [
        "CMake Error at (?<file>[\\/0-9a-zA-Z\\._-]+):(?<line>\\d+)"
    ];
    const generateWarningMatch = [
        "CMake Error at (?<file>[\\/0-9a-zA-Z\\._-]+):(?<line>\\d+)"
    ];
    const compileErrorMatch = [
        "(?<file>.+):(?<line>\\d+):(?<column>\\d+):\\s+(.*\\s+)?error:\\s+(?<message>.+)", // GCC/Clang Error
        "(.*>)?(?<file>.+)\\((?<line>\\d+)\\):\\s+(.*\\s+)?error\\s+(C\\d+):(?<message>.*)" // Visual Studio Error
    ];
    const compileWarningMatch = [
        "(?<file>.+):(?<line>\\d+):(?<column>\\d+):\\s+(.*\\s+)?warning:\\s+(?<message>.+)", // GCC/Clang warning
        "(.*>)?(?<file>.+)\\((?<line>\\d+)\\):\\s+(.*\\s+)?warning\\s+(C\\d+):(?<message>.*)" // Visual Studio warning
    ];
    return class CMakeBuildProvider extends EventEmitter {
        constructor(source_dir)
        {
            super();
            atom.config.observe('build-cmake.cmakelists', (cmakelists) => {
                this.source_dir = (!!cmakelists) ? source_dir + cmakelists.trim() : source_dir;
            });
            atom.config.observe('build-cmake.build_suffix', (suffix) => {
                this.build_dir = source_dir + suffix;
                this.cache_path = path.join(this.build_dir, 'CMakeCache.txt');
            });
            atom.config.observe('build-cmake.generator', (generator) => {
                // TODO: Validate generator exists and show feedback to user.
                this.generator = (!!generator) ? generator.trim() : '';
            });
            atom.config.observe('build-cmake.executable', (executable) => {
                // TODO: Validate executable is on path/exists and show feedback to user.
                this.executable = executable;
            });
            atom.config.observe('build-cmake.cmake_arguments', (args) => {
                this.cmake_arguments = args.split(' ').filter(v => v !== '');
            });
            atom.config.observe('build-cmake.build_arguments', (args) => {
                this.build_arguments = args.split(' ').filter(v => v !== '');
            });
            atom.config.observe('build-cmake.parallel_build', (parallel_build) => {
                this.parallel_build = parallel_build;
            });
            atom.config.onDidChange('build-cmake.build_suffix', () => { this.emit('refresh'); });
            atom.config.onDidChange('build-cmake.executable', () => { this.emit('refresh'); });
            atom.config.onDidChange('build-cmake.generator', () => { this.emit('refresh'); });
            atom.config.onDidChange('build-cmake.cmakelists', () => { this.emit('refresh'); });
            atom.config.onDidChange('build-cmake.cmake_arguments', () => { this.emit('refresh'); });
            atom.config.onDidChange('build-cmake.build_arguments', () => { this.emit('refresh'); });
            atom.config.onDidChange('build-cmake.parallel_build', () => { this.emit('refresh'); });
        }

        destructor()
        {
        }

        getNiceName()
        {
            return 'cmake';
        }

        isEligible()
        {
            return fs.existsSync(path.join(this.source_dir, 'CMakeLists.txt')) || fs.existsSync(this.cache_path);
        }

        createVisualStudioTarget(target_name)
        {
            args_list = [ '--build', this.build_dir, '--target', target_name, '--' ];
            if (this.parallel_build)
                args_list.push('/maxcpucount');
            return {
                atomCommandName : 'cmake:' + target_name,
                name : target_name,
                exec : this.executable,
                cwd : this.build_dir,
                args : args_list.concat(this.build_arguments),
                errorMatch : compileErrorMatch.concat(generateErrorMatch),
                warningMatch : compileWarningMatch.concat(generateWarningMatch),
                sh : false
            };
        }

        visualStudioTargets()
        {
            return Array.from(new Set(glob.sync("**/*.vcxproj", { cwd : this.build_dir, nodir : true, ignore : "CMakeFiles/**" })
                                          .map(target => path.basename(target, '.vcxproj'))))
                .map(target => this.createVisualStudioTarget(target))
                .concat([ this.createVisualStudioTarget('clean') ]);
        }

        createMakeFileTarget(target_name)
        {
            args_list = [ '--build', this.build_dir, '--target', target_name, '--' ];
            if (this.parallel_build)
                args_list.push('-j' + os.cpus().length);
            return {
                atomCommandName : 'cmake:' + target_name,
                name : target_name,
                exec : this.executable,
                cwd : this.build_dir,
                args : args_list.concat(this.build_arguments),
                errorMatch : compileErrorMatch.concat(generateErrorMatch),
                warningMatch : compileWarningMatch.concat(generateWarningMatch),
                sh : false
            };
        }

        makeFileTargets()
        {
            output = execSync(
                this.executable + ' --build "' + this.build_dir + '" --target help', { cwd : this.build_dir });
            return output.toString('utf8')
                .split(/[\r\n]{1,2}/)
                .filter(line => line.startsWith('...'))
                .map((line) => this.createMakeFileTarget(line.replace('... ', '').split(' ')[0]));
        }

        createNinjaTarget(target_name)
        {
            return {
                atomCommandName : 'cmake:' + target_name,
                name : target_name,
                exec : this.executable,
                cwd : this.build_dir,
                args : [ '--build', this.build_dir, '--target', target_name ].concat(this.build_arguments),
                errorMatch : compileErrorMatch.concat(generateErrorMatch),
                warningMatch : compileWarningMatch.concat(generateWarningMatch),
                sh : false
            };
        }

        ninjaTargets()
        {
            output = execSync(
                this.executable + ' --build "' + this.build_dir + '" -- -t targets', { cwd : this.build_dir });
            return output.toString('utf8')
                .split(/[\r\n]{1,2}/)
                .map((line) => this.createNinjaTarget(line.split(':')[0].trim()));
        }

        settings()
        {
            fs.unwatchFile(this.cache_path);

            fs.watchFile(this.cache_path, (curr, prev) => {
                if (fs.existsSync(this.cache_path) && curr.mtime != prev.mtime)
                    this.emit('refresh');
            });

            var args = this.cmake_arguments.concat([ '-B' + this.build_dir, '-H' + this.source_dir, '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON' ]);
            // Add custom generator if specified.
            if (!!this.generator) {
                args.unshift('-G' + this.generator);
            }
            const generateTarget = {
                atomCommandName : 'cmake:generate',
                name : 'generate',
                exec : this.executable,
                cwd : this.source_dir,
                args : args,
                errorMatch : generateErrorMatch,
                warningMatch : generateWarningMatch,
                sh : false
            };

            return voucher(fs.readFile, this.cache_path, { encoding : 'utf8' })
                .then(cache => {
                    var generator = cache.match(/CMAKE_GENERATOR:INTERNAL=(.*)/)[1];
                    if (generator.match('Visual Studio'))
                        return [ generateTarget ].concat(this.visualStudioTargets());
                    else if (generator.match('Ninja'))
                        return [ generateTarget ].concat(this.ninjaTargets());
                    else
                        return [ generateTarget ].concat(this.makeFileTargets());
                })
                .catch(e => {
                    return [ generateTarget ];
                });
        }
    };
}
