import Foundation

/// Qué mitad del snapshot se pinta: los datos reales (tras Face ID) o el
/// demo (sin sesión). La elección vive en la portada, no en Ajustes.
enum Dataset {
    case live
    case demo
}
