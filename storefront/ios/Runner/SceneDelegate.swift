import Flutter
import UIKit

class SceneDelegate: FlutterSceneDelegate {
  override func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    super.scene(scene, willConnectTo: session, options: connectionOptions)

    // flutter_stripe 11.x looks up the presenter through
    // UIApplicationDelegate.window. With Flutter's UIScene lifecycle the
    // active window belongs to this SceneDelegate, so bridge it to the app
    // delegate or Payment Sheet is presented from a detached controller and
    // its Future never completes.
    if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
      appDelegate.window = window
    }
  }
}
