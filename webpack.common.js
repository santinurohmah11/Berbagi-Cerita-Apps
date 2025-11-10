const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    app: path.resolve(__dirname, "src/scripts/index.js"),
  },

  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },

  module: {
    rules: [
      // ✅ Untuk file CSS
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },

      // ✅ Untuk file gambar (termasuk ikon bawaan Leaflet)
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: "asset/resource",
        generator: {
          filename: "images/[name][ext]",
        },
      },
    ],
  },

  plugins: [
    // ✅ Biar index.html ikut dibuild ke dist/
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "src/index.html"),
      filename: "index.html",
      favicon: path.resolve(__dirname, "src/public/images/favicon.png"), // favicon muncul di tab browser
      title: "Berbagi Cerita",
      favicon: path.resolve(__dirname, 'src/public/images/favicon.png'),
    }),

    // ✅ Salin semua aset public ke dist
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, "src/public/images"), to: path.resolve(__dirname, "dist/images") },
        { from: path.resolve(__dirname, "src/styles"), to: path.resolve(__dirname, "dist/styles") },
        { from: "src/service-worker.js", to: "" },
        { from: path.resolve(__dirname, "src/public/manifest.json"), to: path.resolve(__dirname, "dist/manifest.json") },
      ],
    }),

  ],
};
