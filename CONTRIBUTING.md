# Contributing to QuaiMiner Core

Thank you for your interest in contributing to QuaiMiner CORE! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/thecrackofdan/quaiminer-core/issues)
2. If not, create a new issue using the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md)
3. Include as much detail as possible:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, GPU, etc.)
   - Screenshots or logs if applicable

### Suggesting Features

1. Check if the feature has already been suggested
2. Create a new issue using the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
3. Clearly describe the feature and why it would be useful

### Pull Requests

1. **Fork the repository**
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following the coding standards
4. **Test your changes** thoroughly
5. **Update documentation** if needed
6. **Commit your changes** with clear messages:
   ```bash
   git commit -m "Add: Description of your feature"
   ```
7. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Create a Pull Request** using the PR template

## Development Setup

### Prerequisites

- Node.js 14+ and npm
- Git
- A code editor (VS Code recommended)

### Setup Steps

1. Clone your fork:
   ```bash
   git clone https://github.com/your-username/quaiminer-core.git
   cd quaiminer-core
   ```

2. For dashboard development, see the `miner-dashboard/` directory in this repository
3. For setup scripts and research documentation, work directly in this repository

## Coding Standards

### JavaScript/Node.js

- Use ES6+ features
- Follow existing code style
- Add comments for complex logic
- Keep functions focused and small
- Use meaningful variable names

### Git Commit Messages

- Use clear, descriptive messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 72 characters
- Add more details in the body if needed

Examples:
```
Add: Timeout handling for fetch requests
Fix: Dashboard not updating on network errors
Update: README with new installation steps
```

## Project Structure

```
.
├── index.html           # Landing page
├── miner-dashboard/     # Dashboard application
├── *.sh                 # Setup and utility scripts
└── *.md                 # Documentation files
```

**Note:** The full-featured Node.js dashboard is included in the `miner-dashboard/` directory of this repository

## Testing

Before submitting a PR:

1. Test your changes locally
2. For setup scripts: Test on a clean Ubuntu 20.04 system if possible
3. For documentation: Verify all links work and formatting is correct
4. For dashboard changes: Work in the `miner-dashboard/` directory of this repository

## Documentation

- Update README.md if adding new features
- Add comments to complex code
- Update CHANGELOG.md for significant changes
- Keep documentation clear and concise

## Questions?

- Open an issue for discussion
- Check existing documentation
- Review closed issues/PRs for similar work

Thank you for contributing to QuaiMiner CORE! 🚀

