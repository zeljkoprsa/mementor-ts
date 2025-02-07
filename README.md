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

### Requirements

- Node.js >= 16.0.0
- npm >= 7.0.0

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
git clone https://github.com/zeljkoprsa/mementor-ts.git

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

Mementor-ts provides a flexible documentation structure that you can customize to your needs. Here's a suggested structure:

### 1. Active Context

- Current focus areas and development status
- Recent architectural decisions
- Known issues and limitations
- Development environment setup
- Planned next steps

### 2. Technical Documentation

- Architecture overview
- Technology stack details
- External dependencies
- Infrastructure setup
- Security considerations

### 3. Development Guidelines

- Coding standards
- Design patterns in use
- Testing strategy
- CI/CD workflow

### 4. Project Information

- Project overview
- Getting started guide
- Contributing guidelines
- Release notes

You can customize this structure by modifying the templates in your project's configuration.

## Health Metrics

Mementor-ts tracks various documentation health metrics to help you maintain high-quality documentation:

- Documentation coverage and completeness
- Update frequency and freshness
- Content structure analysis
- Code example coverage
- Change frequency patterns
- Documentation size metrics

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

- GitHub Issues: [Report bugs or request features](https://github.com/zeljkoprsa/mementor-ts/issues)
- Documentation: Check the `docs` directory in the repository for detailed documentation

## Roadmap

- [ ] Enhanced documentation health metrics
- [ ] Automated documentation testing in CI/CD
- [ ] Custom documentation templates
- [ ] Documentation quality scoring system
- [ ] Integration with popular documentation platforms
- [ ] Real-time collaboration features
- [ ] Documentation impact analysis
- [ ] AI-powered documentation suggestions
