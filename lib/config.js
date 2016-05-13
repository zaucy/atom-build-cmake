'use babel';

export default {
  executable: {
    title: 'Cmake Executable',
    description: 'The path to the cmake executable.',
    type: 'string',
    default: 'cmake',
    order: 1
  },
  generator: {
    title: 'Generator',
    description: 'The default cmake generator.',
    type: 'string',
    default: '',
    order: 2
  },
  build_suffix: {
    title: 'Build Location',
    description: 'The build suffix appended to the source dir (may be a path location such as "/build").',
    type: 'string',
    default: '-build',
    order: 3
  }
}
