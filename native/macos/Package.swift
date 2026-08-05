// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "FormeLocal",
    platforms: [.macOS(.v26)],
    products: [
        .executable(name: "FormeLocal", targets: ["FormeLocal"]),
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "FormeLocal",
            path: "Sources/FormeLocal"
        ),
        .testTarget(
            name: "FormeLocalTests",
            dependencies: ["FormeLocal"],
            path: "Tests/FormeLocalTests"
        ),
    ],
    swiftLanguageModes: [.v6]
)
