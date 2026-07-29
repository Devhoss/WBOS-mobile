const { withAppBuildGradle, withProjectBuildGradle } = require("@expo/config-plugins");

function addGoogleServicesClasspath(buildGradle) {
  const pattern = /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin['"]\)/;
  if (!buildGradle.match(pattern)) return buildGradle;
  return buildGradle.replace(
    pattern,
    "$&\n    classpath('com.google.gms:google-services:4.4.2')",
  );
}

function addGoogleServicesPlugin(appBuildGradle) {
  if (appBuildGradle.includes("com.google.gms.google-services")) return appBuildGradle;
  return appBuildGradle.replace(
    /apply plugin: ["']com\.facebook\.react["']/,
    "$&\napply plugin: \"com.google.gms.google-services\"",
  );
}

function withFirebaseGradle(config) {
  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes("google-services")) return cfg;
    cfg.modResults.contents = addGoogleServicesClasspath(cfg.modResults.contents);
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = addGoogleServicesPlugin(cfg.modResults.contents);
    return cfg;
  });

  return config;
}

module.exports = withFirebaseGradle;
