namespace MondrAIn.Core.Models;

public readonly struct PixelColor : IEquatable<PixelColor>
{
    public byte R { get; init; }
    public byte G { get; init; }
    public byte B { get; init; }
    public byte A { get; init; }

    public PixelColor(byte r, byte g, byte b, byte a = 255)
    {
        R = r;
        G = g;
        B = b;
        A = a;
    }

    public bool Equals(PixelColor other) =>
        R == other.R && G == other.G && B == other.B && A == other.A;

    public override bool Equals(object? obj) => obj is PixelColor other && Equals(other);

    public override int GetHashCode() => HashCode.Combine(R, G, B, A);

    public static bool operator ==(PixelColor left, PixelColor right) => left.Equals(right);

    public static bool operator !=(PixelColor left, PixelColor right) => !left.Equals(right);
}
