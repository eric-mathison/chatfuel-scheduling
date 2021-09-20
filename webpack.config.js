const webpack = require("webpack");
const path = require("path");

const env = process.env.NODE_ENV || "development";

module.exports = {
    entry: ["babel-polyfill", "./src/app.js"],
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "dist/public/js"),
    },
    devtool:
        env == "development"
            ? "cheap-inline-module-source-map"
            : "cheap-source-map",
    resolve: {
        modules: ["node_modules"],
        extensions: [".js"],
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: "babel-loader",
                    options: {
                        babelrc: false,
                        presets: [
                            [
                                "@babel/env",
                                {
                                    targets: {
                                        browsers: [
                                            "last 2 versions",
                                            "safari >= 9",
                                        ],
                                    },
                                },
                            ],
                        ],
                    },
                },
            },
        ],
    },
    mode: env,
};

if (env == "production") {
    module.exports.plugins.push(
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false,
                unsafe: true,
                drop_console: true,
            },
        })
    );
}
