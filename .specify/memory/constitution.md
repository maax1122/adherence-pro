<!--
Sync Impact Report - v1.0.0 (2025-10-06)
========================================
Version Change: INITIAL → 1.0.0
Change Type: MAJOR (initial constitution ratification)

Modified Principles:
- [NEW] I. Test-Driven Development (TDD)
- [NEW] II. Code Quality Standards
- [NEW] III. User Experience Consistency
- [NEW] IV. Performance Requirements
- [NEW] V. Documentation & Maintainability

Added Sections:
- Core Principles (5 principles)
- Quality Gates
- Development Workflow
- Governance

Templates Status:
✅ plan-template.md - Aligned with Constitution Check requirements
✅ spec-template.md - Aligned with testability requirements
✅ tasks-template.md - Aligned with TDD and testing principles

Follow-up TODOs: None
-->

# Adherence Pro Constitution

## Core Principles

### I. Test-Driven Development (TDD) - NON-NEGOTIABLE

**Every line of production code MUST be preceded by a failing test.**

- Tests are written first, reviewed, approved, and MUST fail before implementation begins
- Red-Green-Refactor cycle is strictly enforced without exception
- Test files MUST be created in Phase 3.2 and MUST pass before proceeding to Phase 3.3
- All features require comprehensive test coverage:
  - Unit tests for individual functions and components
  - Integration tests for cross-module interactions
  - Contract tests for all external interfaces and APIs
- Tests MUST be executable, repeatable, and deterministic
- No code review shall be approved without corresponding test coverage

**Rationale**: TDD ensures correctness by design, reduces debugging time, serves as living
documentation, and prevents regression. This is the foundational practice upon which all
other quality principles depend.

### II. Code Quality Standards

**Code MUST meet strict quality criteria before merging.**

- Linting and formatting tools MUST be configured and enforced (Phase 3.1)
- Zero tolerance for:
  - Compiler/interpreter warnings
  - Linter violations (unless explicitly documented and justified)
  - Dead code or unused imports
  - Magic numbers without named constants
- Code reviews MUST verify:
  - Clear, self-documenting variable and function names
  - Functions with single, well-defined responsibilities
  - Comments explaining WHY, not WHAT (code explains what)
  - Proper error handling with meaningful messages
- All dependencies MUST be explicitly declared with version constraints
- Security vulnerabilities in dependencies MUST be addressed within 48 hours of detection

**Rationale**: Consistent code quality reduces cognitive load, accelerates onboarding, and
minimizes defects. Quality is not negotiable; it's faster to write it right the first time.

### III. User Experience Consistency

**User-facing interfaces MUST provide predictable, coherent experiences.**

- All CLI tools MUST follow text-based I/O protocol:
  - Input via stdin or command arguments
  - Success output to stdout
  - Errors and diagnostics to stderr
  - Support both JSON and human-readable formats
- Error messages MUST be:
  - Actionable (tell users what to do next)
  - Contextual (include relevant state information)
  - Consistent in tone and format
- UI/UX patterns MUST be documented and reused across features
- Accessibility requirements MUST be considered in all user-facing components
- User feedback loops MUST be incorporated during specification phase

**Rationale**: Consistency reduces learning curve, builds user trust, and minimizes support
burden. Users should never be surprised by interface inconsistencies.

### IV. Performance Requirements

**Performance characteristics MUST be specified, measured, and maintained.**

- Every feature specification MUST include:
  - Target response times (e.g., p95 latency < 200ms)
  - Resource constraints (e.g., memory usage < 100MB)
  - Scale expectations (e.g., concurrent users, data volume)
- Performance tests MUST be included in test suites where applicable
- Performance regressions MUST be caught in CI/CD pipeline
- Optimization decisions MUST be data-driven:
  - Profile before optimizing
  - Document baseline metrics
  - Validate improvements with measurements
- Performance-critical code paths MUST be documented

**Rationale**: Performance issues are defects. Establishing performance requirements upfront
prevents costly rewrites and maintains user satisfaction as systems scale.

### V. Documentation & Maintainability

**Code MUST be maintainable by future developers with minimal context.**

- Every feature MUST have:
  - A complete specification in `spec.md` (WHAT and WHY, not HOW)
  - An implementation plan in `plan.md` (technical decisions and structure)
  - A task breakdown in `tasks.md` (executable steps)
- Public APIs and contracts MUST have:
  - Clear interface documentation
  - Usage examples
  - Expected inputs/outputs with types
  - Error conditions and handling
- Architecture decisions MUST be documented with rationale
- Breaking changes MUST follow semantic versioning (MAJOR.MINOR.PATCH):
  - MAJOR: Breaking API changes
  - MINOR: Backward-compatible features
  - PATCH: Backward-compatible fixes
- Agent-specific guidance files (e.g., `CLAUDE.md`, `.github/copilot-instructions.md`)
  MUST be maintained and kept in sync with constitution

**Rationale**: Documentation is insurance against knowledge loss. Well-documented systems
enable faster feature development, easier onboarding, and confident refactoring.

## Quality Gates

**Gates MUST be passed before proceeding to next phase.**

### Pre-Development Gate (Specification Phase)
- [ ] Feature specification complete and reviewed
- [ ] All `[NEEDS CLARIFICATION]` markers resolved
- [ ] User scenarios testable and unambiguous
- [ ] Performance requirements specified
- [ ] No implementation details in specification

### Pre-Implementation Gate (Planning Phase)
- [ ] Constitution check passed (no violations or violations justified)
- [ ] Technical stack and dependencies identified
- [ ] Research phase completed (all unknowns resolved)
- [ ] Design documents created (contracts, data models)
- [ ] No unresolved `NEEDS CLARIFICATION` markers

### Pre-Code Gate (Task Phase)
- [ ] Test tasks created and sequenced before implementation tasks
- [ ] All dependencies between tasks documented
- [ ] File paths and structure determined
- [ ] Parallel execution strategy defined

### Pre-Merge Gate (Review Phase)
- [ ] All tests passing (unit, integration, contract)
- [ ] Code quality checks passing (linting, formatting)
- [ ] Test coverage meets requirements
- [ ] Documentation updated
- [ ] Performance benchmarks met (if applicable)
- [ ] Security scan passed
- [ ] Code review approved by at least one other developer

## Development Workflow

**The specification-driven development workflow MUST be followed for all features.**

### Phase 0: Specification
1. User provides feature description
2. Create feature specification using `/specify` (or `create-new-feature.sh`)
3. Mark all ambiguities with `[NEEDS CLARIFICATION: question]`
4. Review with stakeholders until specification is unambiguous
5. **Gate**: Specification complete and approved

### Phase 1: Planning
1. Execute `/plan` (or `setup-plan.sh`) to create implementation plan
2. Conduct research to resolve technical unknowns
3. Perform constitution check and document any violations with justification
4. Design contracts, data models, and architecture
5. **Gate**: All unknowns resolved, constitution check passed

### Phase 2: Task Breakdown
1. Execute `/tasks` to generate task list
2. Sequence tasks with tests before implementation (TDD)
3. Mark parallel-executable tasks with `[P]`
4. **Gate**: Task list complete and executable

### Phase 3: Implementation
1. **Phase 3.1**: Setup (project structure, dependencies, tooling)
2. **Phase 3.2**: Tests First (write ALL tests, verify they fail)
3. **Phase 3.3**: Implementation (make tests pass)
4. **Phase 3.4**: Polish (documentation, performance tuning, final review)
5. **Gate**: All quality gates passed

### Phase 4: Integration & Deployment
1. Integration testing with other systems
2. Performance validation
3. Documentation review
4. Deployment to target environment

## Governance

**The constitution supersedes all other practices and guidelines.**

### Amendment Process
1. Proposed changes MUST be documented with:
   - Rationale for change
   - Impact analysis on existing projects
   - Migration plan if breaking existing practices
2. Changes MUST be reviewed and approved by project maintainers
3. Version MUST be incremented according to semantic versioning:
   - MAJOR: New principles, removed principles, breaking governance changes
   - MINOR: Refined principles, new sections, enhanced guidance
   - PATCH: Clarifications, typo fixes, non-semantic improvements
4. All dependent templates and documentation MUST be updated before amendment is final
5. Amendment history MUST be tracked in Sync Impact Report comments

### Compliance Review
- All feature specifications, plans, and code reviews MUST verify constitution compliance
- Violations MUST be documented with explicit justification in the constitution check section
- Unjustified violations MUST block progression to next phase
- Complexity that cannot be justified MUST be simplified

### Living Document
- This constitution is a living document and will evolve with project needs
- Feedback and improvement suggestions are encouraged
- Changes require consensus and documented rationale
- Use agent-specific guidance files for runtime development instructions that don't warrant
  constitutional inclusion

**Version**: 1.0.0 | **Ratified**: 2025-10-06 | **Last Amended**: 2025-10-06