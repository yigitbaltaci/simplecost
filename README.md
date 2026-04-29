# simplecost

See where your Anthropic API budget actually goes.

> Requires an **Anthropic Admin API key** (Teams and Enterprise plans only).

## Install

```bash
npm install -g simplecost
```

## Usage

```bash
simplecost
```

Opens an interactive shell. Run in order:

```
auth      ← paste your admin API key
sync      ← pull usage data from Anthropic
report    ← total spend
projects  ← breakdown by workspace
models    ← breakdown by model
```

Commands also work directly:

```bash
simplecost sync --days 30
simplecost report --json
simplecost projects --days 30
simplecost models --days 30
simplecost export --format csv --output spend.csv
simplecost prices
```

No admin key? Try mock mode:

```bash
simplecost sync --mock
simplecost report
```

## Data & privacy

Everything stays local in `~/.claude-cost/`. No third-party servers — all API calls go directly to `api.anthropic.com`.

## License

MIT
