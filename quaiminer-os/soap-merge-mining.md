# SOAP Merge Mining with Ravencoin

## Overview

SOAP (Solo Optimized Algorithm Protocol) is designed to enable merge mining between Quai Network and Ravencoin, allowing miners to earn rewards from both networks simultaneously.

## Current Status

**Note**: SOAP merge mining is under active development. This document will be updated as more information becomes available.

## Implementation Plan

### Phase 1: Algorithm Detection
- Detect SOAP algorithm support in quai-gpu-miner
- Verify Ravencoin compatibility
- Test merge mining functionality

### Phase 2: Configuration
- Add SOAP configuration options
- Enable/disable merge mining
- Configure Ravencoin parameters

### Phase 3: Integration
- Integrate SOAP support into QuaiMiner CORE OS
- Update dashboard for merge mining stats
- Add merge mining controls

## Configuration

When SOAP is fully implemented, configuration will be available via:

```json
{
  "merge_mining": {
    "enabled": true,
    "algorithm": "SOAP",
    "ravencoin": {
      "enabled": true,
      "wallet": "RVN_WALLET_ADDRESS"
    }
  }
}
```

## Resources

- Monitor Quai Network announcements for SOAP updates
- Check quai-gpu-miner repository for SOAP support
- Review Ravencoin merge mining documentation

## Updates

This document will be updated as SOAP merge mining becomes available. Check back regularly for the latest information.

