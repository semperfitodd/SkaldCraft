// swift-tools-version: 5.10

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
