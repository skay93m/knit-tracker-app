// swift-tools-version: 6.1
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "knit-tracker-app",
    targets: [
        .target(
            name: "knit_tracker_app",
            dependencies: []),
        .testTarget(
            name: "knit_tracker_appTests",
            dependencies: ["knit_tracker_app"]),
    ]
)
