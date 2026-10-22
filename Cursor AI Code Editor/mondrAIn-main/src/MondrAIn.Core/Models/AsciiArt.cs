namespace MondrAIn.Core.Models;

/// <summary>
/// Immutable grid of ASCII characters produced from a pixel grid.
/// </summary>
public sealed class AsciiArt
{
    private readonly char[] _characters;

    public int Columns { get; }
    public int Rows { get; }

    public AsciiArt(int columns, int rows, char[] characters)
    {
        if (columns <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(columns), "Columns must be positive.");
        }

        if (rows <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(rows), "Rows must be positive.");
        }

        ArgumentNullException.ThrowIfNull(characters);

        if (characters.Length != columns * rows)
        {
            throw new ArgumentException(
                $"Expected {columns * rows} characters, but received {characters.Length}.",
                nameof(characters));
        }

        Columns = columns;
        Rows = rows;
        _characters = (char[])characters.Clone();
    }

    public char this[int column, int row]
    {
        get
        {
            if (column < 0 || column >= Columns)
            {
                throw new ArgumentOutOfRangeException(nameof(column));
            }

            if (row < 0 || row >= Rows)
            {
                throw new ArgumentOutOfRangeException(nameof(row));
            }

            return _characters[(row * Columns) + column];
        }
    }

    public IEnumerable<string> GetRows()
    {
        for (var row = 0; row < Rows; row++)
        {
            yield return new string(_characters, row * Columns, Columns);
        }
    }
}
