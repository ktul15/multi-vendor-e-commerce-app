/// Environment configuration using compile-time defines.
///
/// Usage:
/// ```bash
/// flutter run --dart-define=API_BASE_URL=https://api.example.com/api/v1
/// ```
class AppEnv {
  AppEnv._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:5000/api/v1',
  );

  static const String appName = String.fromEnvironment(
    'APP_NAME',
    defaultValue: 'Storefront',
  );

  static const bool isProduction = String.fromEnvironment(
    'ENV',
    defaultValue: 'development',
  ) == 'production';
}
