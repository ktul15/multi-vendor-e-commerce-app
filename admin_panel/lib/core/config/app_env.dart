/// Environment configuration using compile-time defines.
class AppEnv {
  AppEnv._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:5000/api/v1',
  );

  static const String appName = String.fromEnvironment(
    'APP_NAME',
    defaultValue: 'Admin Panel',
  );

  static const bool isProduction =
      String.fromEnvironment('ENV', defaultValue: 'development') ==
      'production';
}
