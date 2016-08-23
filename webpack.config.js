const Path = require('path'),
    Webpack = require('webpack'),
    plugins= [],
    prod = process.argv[4] === '--production';

if (prod) {
    plugins.push(new Webpack.optimize.UglifyJsPlugin({
        compress: {
            warnings: false
        }
    }));
}

plugins.push(new Webpack.DefinePlugin({
    __PRODUCTION__: prod,
    __DEV__: !prod
}));

const config = {
    entry: {
        app: ['babel-polyfill', './src/app']
    },
    output: {
        path: './build',
        publicPath: '/build',
        filename: '[name]-bundle.js'
    },
    devServer: {
        inline: true,
        contentBase: './build'
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                include: [
                    Path.resolve(process.cwd(), 'src')
                ],
                loader: 'babel',
                query: {
                    presets: ['es2015']
                }
            }
        ]
    },
    resolve: {
        extension: ['', '.js'],
        modulesDirectory: ['node_modules']
    },
    plugins: plugins
};

module.exports = config;