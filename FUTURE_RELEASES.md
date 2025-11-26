# 🚀 Future Releases - Easy Method

## ✅ One-Time Setup (Done!)

GitHub CLI is installed. You're all set for future releases!

## 📦 Creating Future Releases

### Method 1: GitHub CLI (Easiest - No Token Needed!)

```powershell
# Create a new release (one command!)
gh release create v2.1.0 --title "QuaiMiner CORE OS v2.1.0" --notes-file RELEASE_NOTES.md

# Or with a tag you already created
git tag v2.1.0
git push origin v2.1.0
gh release create v2.1.0 --title "QuaiMiner CORE OS v2.1.0" --notes-file RELEASE_NOTES.md
```

### Method 2: GitHub Actions (Automatic!)

Just push a tag and it creates a release automatically:

```powershell
# Create and push tag
git tag v2.1.0
git push origin v2.1.0

# Release is created automatically via GitHub Actions!
```

Or use the workflow manually:
1. Go to: **Actions** → **Create Release** → **Run workflow**
2. Enter version and title
3. Click **Run workflow**

### Method 3: PowerShell Script (If GitHub CLI Not Available)

```powershell
.\setup-github-release.ps1
```

## 🔄 Updating Repository Description

```powershell
gh repo edit --description "Your new description here"
```

## 🏷️ Adding Topics

```powershell
gh repo edit --add-topic quai-network --add-topic mining --add-topic gpu-mining
```

## 📋 Quick Reference

| Task | Command |
|------|---------|
| Create release | `gh release create vX.Y.Z --title "Title" --notes-file RELEASE_NOTES.md` |
| List releases | `gh release list` |
| View release | `gh release view vX.Y.Z` |
| Update description | `gh repo edit --description "Description"` |
| Add topics | `gh repo edit --add-topic topic1 --add-topic topic2` |

## ✅ No More Tokens Needed!

GitHub CLI handles authentication automatically. Just use `gh` commands!

---

**First time using GitHub CLI?** Run `gh auth login` to authenticate (one-time setup).

