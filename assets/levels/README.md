# Curated Levels

This folder contains hand-crafted puzzle levels for CubeRoll.

## Level Format

Each level is a separate JSON file. The filename (without `.json`) serves as the level ID.

### Schema

```json
{
  "name": "Level Name",
  "description": "What makes this level interesting",
  "difficulty": 5.0,
  "parMoves": 10,
  "tags": ["tag1", "tag2"],
  "author": "Author Name",
  "dateCreated": "YYYY-MM-DD",
  "gridSize": 3,
  "cubes": [
    {
      "id": 1,
      "position": { "x": 0, "y": 0 },
      "orientation": "red:green"
    }
  ],
  "goals": [
    {
      "position": { "x": 2, "y": 0 },
      "color": "red"
    }
  ]
}
```

### Field Descriptions

- **name**: Display name for the level
- **description**: Brief description or hint
- **difficulty**: Numeric difficulty rating (float, e.g., 1.0 to 10.0)
- **parMoves**: Target number of moves for an optimal solution
- **tags**: Array of categorization tags
- **author**: Level creator's name
- **dateCreated**: ISO date format (YYYY-MM-DD)
- **gridSize**: Must be 3, 5, or 7
- **cubes**: Array of cube starting states
  - **id**: Unique identifier (1-indexed)
  - **position**: Grid coordinates (0-indexed, relative to grid size)
  - **orientation**: Face orientation key (e.g., "red:green", "blue:white")
- **goals**: Array of goal positions
  - **position**: Grid coordinates where cube must land
  - **color**: Required face color ("red", "orange", "green", "blue", "white", "yellow")

### Valid Orientations

All 24 cube orientations are valid:
- Primary faces: red, orange, green, blue, white, yellow
- Format: `"primaryFace:adjacentFace"` (e.g., "red:green" means red on top, green facing north)

### Guidelines

- Keep gridSize to 3, 5, or 7 for curated levels
- Ensure goals match the number of cubes
- Test levels to verify parMoves is accurate
- Use descriptive tags for filtering and discovery
