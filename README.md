# Mementor TypeScript (mementor-ts)

A powerful documentation management tool that helps you maintain living documentation for your projects. Mementor-ts automatically tracks documentation health, generates snapshots, and provides insights into your documentation's evolution over time.

## Features

- 📝 **Living Documentation**: Keep your documentation in sync with your codebase
- 📸 **Snapshots**: Track documentation changes over time
- 📊 **Health Metrics**: Monitor documentation quality and completeness
- 🔄 **Change Tracking**: Compare snapshots to see how documentation evolves
- 📁 **Organized Storage**: Hierarchical storage of snapshots by year/month/day
- 🔍 **Smart Comparison**: Intelligent diffing of documentation changes

## Installation

### Global Installation
```bash
npm install -g mementor-ts
```

### Local Project Installation
```bash
npm install --save-dev mementor-ts
```

### Development Setup
```bash
# Clone the repository
git clone https://github.com/your-username/mementor-ts.git

# Install dependencies
cd mementor-ts
npm install

# Build the project
npm run build
```

## Usage

### Initialize a Project
```bash
mementor init
```
This creates the initial documentation structure:
```
docs/
└── context/
    ├── active_context.md
    ├── tech_context.md
    ├── system_patterns.md
    ├── product_brief.md
    └── snapshots/
```

### Create Snapshots
```bash
# Create a new snapshot
mementor snapshot

# Watch for changes and create snapshots automatically
mementor watch
```

### Organize Snapshots
```bash
# Clean up and organize snapshots into year/month/day structure
mementor cleanup
```

### Compare Snapshots
```bash
# Compare latest snapshots
mementor compare

# Compare snapshots from a specific date
mementor compare --date 2025-02-07

# Compare specific snapshots
mementor compare --old snapshots/old.md --new snapshots/new.md
```

## Documentation Structure

### 1. Active Context (`active_context.md`)
- Current focus areas
- Recent decisions
- Known issues
- Development environment
- Next steps

### 2. Technical Context (`tech_context.md`)
- Technology stack
- External dependencies
- Infrastructure setup
- Security measures

### 3. System Patterns (`system_patterns.md`)
- Architectural patterns
- Design patterns
- Code style patterns
- Testing patterns

### 4. Product Brief (`product_brief.md`)
- Product overview
- Target audience
- Core features
- Timeline and constraints

## Health Metrics

Mementor tracks various documentation health metrics:
- Word count and reading time
- Completion percentage
- Number of sections and code blocks
- TODOs and action items
- Days since last update
- Broken links detection

## Contributing

We welcome contributions! Here's how you can help:

### Setting Up Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/mementor-ts.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Development Workflow

1. Make your changes
2. Run tests:
   ```bash
   npm test
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Commit your changes:
   ```bash
   git commit -m "feat: add new feature"
   ```
5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. Create a Pull Request

### Coding Standards

- Use TypeScript with strict mode enabled
- Follow ESLint and Prettier configurations
- Write tests for new features
- Update documentation as needed

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/your-username/mementor-ts/issues)
- Documentation: [Full documentation](https://github.com/your-username/mementor-ts/wiki)

## Roadmap

- [ ] Automated snapshot scheduling
- [ ] Enhanced metric analysis
- [ ] Integration with CI/CD pipelines
- [ ] Custom template support
- [ ] Documentation quality scoring
- [ ] Multi-language support
