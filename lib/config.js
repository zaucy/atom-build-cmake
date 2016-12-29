'use babel';

export default {
    executable : {
        title : 'CMake Executable',
        description : 'Path to the CMake executable.',
        type : 'string',
        default : 'cmake',
        order : 1
    },
    cmakelists : {
        title : 'CMakeLists',
        description : 'Relative path to the CMakeLists file.',
        type : 'string',
        default : '',
        order : 2
    },
    generator : {
        title : 'Generator',
        description : 'The default CMake generator.',
        type : 'string',
        default : '',
        order : 3,
        enum: ['']
    },
    cmake_arguments : {
        title : 'Custom CMake Arguments',
        description : 'Arguments passed to CMake during the generator phase.',
        type : 'string',
        default : ' -DCMAKE_BUILD_TYPE=Debug ',
        order : 4
    },
    build_suffix : {
        title : 'Build Location',
        description : 'The build suffix appended to the source dir (may be a path location such as "/build").',
        type : 'string',
        default : '-build',
        order : 5
    },
    build_arguments : {
        title : 'Custom Build Tool Arguments',
        description : 'Arguments passed to the build tool while compiling the project.',
        type : 'string',
        default : '',
        order : 6
    },
    parallel_build : {
        title : 'Parallel Build',
        description : 'Enables or disables parallel building using multiple cores.',
        type : 'boolean',
        default : true,
        order : 7
    }
};
