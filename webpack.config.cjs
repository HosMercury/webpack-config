const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const autoprefixer = require("autoprefixer");
const webpack = require("webpack");
const fs = require("fs");

// inject the generated css/js files into the layouts
fs.readdirSync("./static/").forEach((file) => {
  ["base", "guest"].forEach((f) => {
    if (file.startsWith("style")) {
      const regex = /<link rel="stylesheet"\b[^>]*>/gi;
      fs.readFile(`./templates/layouts/${f}.html.j2`, "utf8", (err, data) =>
        err
          ? console.log("ERROR" + err)
          : fs.writeFile(
              `./templates/layouts/${f}.html.j2`,
              data.replace(
                regex,
                `<link rel="stylesheet" href="/static/${file}" type="text/css" />`
              ),
              "utf8",
              (err) =>
                err ? console.log("ERROR" + err) : console.log("SUCCESS")
            )
      );
    }
  });

  ["base", "guest"].forEach((f) => {
    if (file.startsWith("script")) {
      const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;

      fs.readFile(`./templates/layouts/${f}.html.j2`, "utf8", (err, data) =>
        err
          ? console.log("ERROR" + err)
          : fs.writeFile(
              `./templates/layouts/${f}.html.j2`,
              data.replace(
                regex,
                `<script defer src="/static/${file}"></script>`
              ),
              "utf8",
              (err) =>
                err ? console.log("ERROR" + err) : console.log("SUCCESS")
            )
      );
    }
  });
});

module.exports = {
  mode: process.env.NODE_ENV !== "production" ? "development" : "production",
  watchOptions: {
    ignored: ["**/src", "**/node_modules"],
  },
  entry: path.resolve(__dirname, "assets/js/main.js"),
  output: {
    path: path.resolve(__dirname, "static"),
    filename: "script-[chunkhash:10].js",
    clean: true,
    assetModuleFilename: "[name][ext]",
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          format: {
            comments: false,
          },
        },
      }),
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: "style-[chunkhash:10].css" }),
    new CssMinimizerPlugin(),
    new webpack.LoaderOptionsPlugin({
      options: {
        postcss: [autoprefixer()],
      },
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
    }),
  ],
};
