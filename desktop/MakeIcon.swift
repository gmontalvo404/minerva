// Draws the app icon and writes an .iconset folder, ready for `iconutil`.
// Usage: swift MakeIcon.swift <output.iconset>
//
// The mark is an "M" on the dashboard's dark background and accent blue, so the
// Dock icon matches the app it opens.

import AppKit

let background = (top: NSColor(srgbRed: 0.114, green: 0.153, blue: 0.204, alpha: 1),   // #1d2734
                  bottom: NSColor(srgbRed: 0.082, green: 0.125, blue: 0.169, alpha: 1)) // #15202b
let accent = NSColor(srgbRed: 0.114, green: 0.608, blue: 0.941, alpha: 1)               // #1d9bf0

func drawIcon(side: CGFloat, scale: Int) -> NSBitmapImageRep {
    let pixels = Int(side) * scale
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: pixels, pixelsHigh: pixels,
        bitsPerSample: 8, samplesPerPixel: 4,
        hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0, bitsPerPixel: 0
    )!
    rep.size = NSSize(width: side, height: side)

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

    // macOS icons sit inside the canvas with a margin, rounded like the system ones.
    let margin = side * 0.09
    let box = NSRect(x: margin, y: margin, width: side - margin * 2, height: side - margin * 2)
    let shape = NSBezierPath(roundedRect: box, xRadius: box.width * 0.225, yRadius: box.width * 0.225)

    NSGradient(colors: [background.top, background.bottom])?.draw(in: shape, angle: -90)

    // A thin accent rim keeps the icon from disappearing on a dark Dock.
    shape.lineWidth = side * 0.012
    accent.withAlphaComponent(0.55).setStroke()
    shape.stroke()

    let letter = "M" as NSString
    let fontSize = side * 0.58
    let descriptor = NSFont.systemFont(ofSize: fontSize, weight: .bold).fontDescriptor
        .withDesign(.rounded) ?? NSFont.systemFont(ofSize: fontSize, weight: .bold).fontDescriptor
    let font = NSFont(descriptor: descriptor, size: fontSize) ?? NSFont.boldSystemFont(ofSize: fontSize)

    let attributes: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: NSColor.white,
    ]
    let textSize = letter.size(withAttributes: attributes)
    let origin = NSPoint(x: (side - textSize.width) / 2, y: (side - textSize.height) / 2 + side * 0.055)
    letter.draw(at: origin, withAttributes: attributes)

    // Underline in accent blue: the dashboard's baseline, and it balances the M.
    let barWidth = side * 0.34
    let bar = NSRect(x: (side - barWidth) / 2, y: side * 0.245, width: barWidth, height: side * 0.045)
    accent.setFill()
    NSBezierPath(roundedRect: bar, xRadius: bar.height / 2, yRadius: bar.height / 2).fill()

    NSGraphicsContext.restoreGraphicsState()
    return rep
}

func write(_ rep: NSBitmapImageRep, to url: URL) throws {
    guard let data = rep.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "MakeIcon", code: 1)
    }
    try data.write(to: url)
}

let arguments = CommandLine.arguments
guard arguments.count == 2 else {
    FileHandle.standardError.write("usage: swift MakeIcon.swift <output.iconset>\n".data(using: .utf8)!)
    exit(2)
}

let outputDirectory = URL(fileURLWithPath: arguments[1])
try? FileManager.default.removeItem(at: outputDirectory)
try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)

// iconutil expects this exact set of names.
for side in [16, 32, 128, 256, 512] as [CGFloat] {
    let base = Int(side)
    try write(drawIcon(side: side, scale: 1), to: outputDirectory.appendingPathComponent("icon_\(base)x\(base).png"))
    try write(drawIcon(side: side, scale: 2), to: outputDirectory.appendingPathComponent("icon_\(base)x\(base)@2x.png"))
}

print("iconset written to \(outputDirectory.path)")
