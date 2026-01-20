module.exports = {
  eslint: {
    dirs: ["src"]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        port: "",
        pathname: "/**"
      }
    ]
  }
};
