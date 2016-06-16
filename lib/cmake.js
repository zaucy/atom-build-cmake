'use babel';

import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import voucher from 'voucher';
import glob from 'glob';

export const config = require('./config');

export function providingFunction() {
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
        constructor(source_dir) {
            super();
            // TODO allow the source directory to be selected.
            this.source_dir = source_dir;

            atom.config.observe('build-cmake.build_suffix', (suffix) => {
                this.build_dir = this.source_dir + suffix;
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
<<<<<<< HEAD
            atom.config.observe('build-cmake.custom_args', (c_args) => {
                this.custom_args = c_args;
=======
            atom.config.observe('build-cmake.vs_args', (args) => {
              this.vs_args = args.split(' ');
>>>>>>> 357940c708204fc955b2a79c9523ee8308317197
            });
            atom.config.onDidChange('build-cmake.build_suffix', () => {this.emit('refresh');});
            atom.config.onDidChange('build-cmake.executable', () => {this.emit('refresh');});
            atom.config.onDidChange('build-cmake.generator', () => {this.emit('refresh');});
<<<<<<< HEAD
            atom.config.onDidChange('build-cmake.custom_args', () => {this.emit('refresh');});
=======
            atom.config.onDidChange('build-cmake.vs_args', () => {this.emit('refresh');});
>>>>>>> 357940c708204fc955b2a79c9523ee8308317197
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
                exec : this.executable,
                cwd : this.source_dir,
<<<<<<< HEAD
                args : ['--build', this.build_dir, '--target',target_name,'--','/maxcpucount','/clp:NoSummary;ErrorsOnly;Verbosity=quiet'],
=======
                args : [ '--build', this.build_dir, '--target',target_name,'--'].concat(this.vs_args),
>>>>>>> 357940c708204fc955b2a79c9523ee8308317197
                errorMatch : compileErrorMatch.concat(generateErrorMatch),
                warningMatch : compileWarningMatch.concat(generateWarningMatch),
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
                atomCommandName : 'cmake:' + target_name,
                name : target_name,
                exec : this.executable,
                cwd : this.source_dir,
                args : ['--build', this.build_dir, '--target',target_name,'--','-j'+os.cpus().length],
                errorMatch : compileErrorMatch.concat(generateErrorMatch),
                warningMatch : compileWarningMatch.concat(generateWarningMatch),
                sh : false
            };
        }

        makeFileTargets() {
            output = execSync(
              this.executable + ' --build ' + this.build_dir + ' --target help', { cwd: this.build_dir });
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

            var args = [this.custom_args, '-B' + this.build_dir, '-H' + this.source_dir, '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'];
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
                errorMatch:generateErrorMatch,
                warningMatch:generateWarningMatch,
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
