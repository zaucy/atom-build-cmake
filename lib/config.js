'use babel';

export default {
    executable : {
        title : 'Cmake Executable',
        description : 'The path to the cmake executable.',
        type : 'string',
        default : 'cmake',
        order : 1
    },
    cmakelists : {
        title : 'CMakeLists',
        description : 'Relative path to the CMakeLists file.',
        type : 'string',
        default : '',
        order : 1
    },
    generator : {
        title : 'Generator',
        description : 'The default cmake generator.',
        type : 'string',
        default : '',
        order : 2
    },
    build_suffix : {
        title : 'Build Location',
        description : 'The build suffix appended to the source dir (may be a path location such as "/build").',
        type : 'string',
        default : '-build',
        order : 3
    },
    custom_args : {
        title : 'Custom Cmake Arguments',
        description : 'custom cmake arguments',
        type : 'string',
        default : ' -DCMAKE_BUILD_TYPE=Debug ',
        order : 4
    },
    vs_args : {
        title : 'Visual Studio Build Arguments',
        description : 'These build tool arguments are passed when building with Visual Studio.',
        type : 'string',
        default : '/maxcpucount /clp:NoSummary;ErrorsOnly;Verbosity=quiet',
        order : 5
    }
};
