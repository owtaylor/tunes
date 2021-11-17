import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'dependencies.js',
    output: {
        file: 'dependencies_bundle.js',
        format: 'es',
    },
    plugins: [
        resolve(),
        commonjs(),
    ]
};
