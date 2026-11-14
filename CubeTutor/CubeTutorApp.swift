import SwiftUI
import UIKit
import WebKit

@main
struct CubeTutorApp: App {
    var body: some Scene {
        WindowGroup {
            CubeWebView()
                .ignoresSafeArea()
                .background(Color(red: 0.035, green: 0.04, blue: 0.06))
                .preferredColorScheme(.dark)
                .statusBarHidden(false)
        }
    }
}

/// Hosts the bundled WebGL cube trainer (CubeTutor/web/index.html).
/// Everything is loaded from the app bundle; no network access is needed.
struct CubeWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(context.coordinator, name: "haptic")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.035, green: 0.04, blue: 0.06, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        webView.allowsBackForwardNavigationGestures = false
        webView.navigationDelegate = context.coordinator

        if let dir = Bundle.main.url(forResource: "web", withExtension: nil) {
            let index = dir.appendingPathComponent("index.html")
            webView.loadFileURL(index, allowingReadAccessTo: dir)
        } else {
            webView.loadHTMLString(
                "<body style='background:#000;color:#fff;font:20px -apple-system;padding:40px'>Missing web bundle.</body>",
                baseURL: nil)
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        private let light = UIImpactFeedbackGenerator(style: .light)
        private let success = UINotificationFeedbackGenerator()

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard message.name == "haptic" else { return }
            if (message.body as? String) == "success" {
                success.notificationOccurred(.success)
            } else {
                light.impactOccurred(intensity: 0.6)
            }
        }

        // Keep navigation inside the bundle.
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            let scheme = navigationAction.request.url?.scheme ?? ""
            decisionHandler(scheme == "file" || scheme == "about" ? .allow : .cancel)
        }
    }
}
