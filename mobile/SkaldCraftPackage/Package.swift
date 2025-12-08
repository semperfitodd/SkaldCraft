// swift-tools-version: 6.1

import PackageDescription

let package = Package(
    name: "SkaldCraftFeature",
    platforms: [.iOS(.v17)],
    products: [
        .library(
            name: "SkaldCraftFeature",
            targets: ["SkaldCraftFeature"]
        ),
    ],
    targets: [
        .target(
            name: "SkaldCraftFeature"
        ),
        .testTarget(
            name: "SkaldCraftFeatureTests",
            dependencies: [
                "SkaldCraftFeature"
            ]
        ),
    ]
)
