# CMake build system for Atom

Uses the [atom-build](https://github.com/noseglid/atom-build) package to execute [CMake](https://CMake.org/)

* Currently the only supported build directory is ${CMAKE_SOURCE_DIR}/build.

* CMake configuration uses the default CMake generator for the current platform so it will use Visual Studio
on windows and GNU Make on linux. The CMake flag -DCMAKE_EXPORT_COMPILE_COMMANDS=ON is passed on cmake configuration for packages like [you-complete-me](https://atom.io/packages/you-complete-me) to take advantage of.

* If other CMake flags or different a CMake generator needs to be used you will have to run CMake manually for the first time in the directory ${CMAKE_SOURCE_DIR}/build.

This package requires [atom-build](https://github.com/noseglid/atom-build) to be installed.

** Note [atom-build-make](https://github.com/AtomBuild/atom-build-make) and [atom-build-gradle](https://github.com/AtomBuild/atom-build-gradle) where used as a reference for this project as I have almost no experience with web technologies and because of that fixes and additions are VERY welcome. 
