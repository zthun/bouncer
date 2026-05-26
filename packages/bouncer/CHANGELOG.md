# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [4.1.3](https://github.com/zthun/bouncer/compare/v4.1.2...v4.1.3) (2026-05-26)

**Note:** Version bump only for package @zthun/bouncer

## [4.1.2](https://github.com/zthun/bouncer/compare/v4.1.1...v4.1.2) (2026-04-26)

**Note:** Version bump only for package @zthun/bouncer

## <small>4.1.1 (2026-01-31)</small>

- build: update outdated packages ([620d2f4](https://github.com/zthun/bouncer/commit/620d2f4))

## [4.1.0](https://github.com/zthun/bouncer/compare/v4.0.1...v4.1.0) (2026-01-07)

### Features

- it is now possible to redirect web sockets ([623d38d](https://github.com/zthun/bouncer/commit/623d38da79b8ea414abe9258d7c50a2ce3f0b539))
- request handling now supports web sockets ([fcf8c44](https://github.com/zthun/bouncer/commit/fcf8c44f90a9dc77a179f4caa181e117f9f42a41))

## [4.0.1](https://github.com/zthun/bouncer/compare/v4.0.0...v4.0.1) (2026-01-04)

**Note:** Version bump only for package @zthun/bouncer

## [4.0.0](https://github.com/zthun/bouncer/compare/v3.0.0...v4.0.0) (2026-01-04)

### ⚠ BREAKING CHANGES

- configuration domain is now a map over an array

### Features

- bouncer can now run a http server that redirects to https ([b9d15ed](https://github.com/zthun/bouncer/commit/b9d15ed66d4385b87306feaf23179fc1c826758c))
- bouncer can now run http servers if need be ([b9bfdf4](https://github.com/zthun/bouncer/commit/b9bfdf449c58b01824862296e0cf7ef22396ce43))
- bouncer can now start multiple servers on different ports instead of just 1 ([d11bb3a](https://github.com/zthun/bouncer/commit/d11bb3ad48cc76248fc4b1ebb5877cfcd8c5bf95))
- cert generate self signed generates a self signed certificate ([6f53fbb](https://github.com/zthun/bouncer/commit/6f53fbb4e5b919c0975750f20330d5489a69e58e))
- cert-generator generates a self signed cert ([fb78b9d](https://github.com/zthun/bouncer/commit/fb78b9d67b932dcfe2c2be61cf9c445c916b1115))
- you can now run an http server (unsecure) with bouncer ([d12c34d](https://github.com/zthun/bouncer/commit/d12c34d7a9e50748cfee099262e8485a76aa8b53))

### Bug Fixes

- country should be 2 characters ([f0ad575](https://github.com/zthun/bouncer/commit/f0ad57536b929448492a84ea26d0c565f172277f))

### Code Refactoring

- configuration domain is now a map over an array ([972aa5a](https://github.com/zthun/bouncer/commit/972aa5a8159fe57baacf08964dc14f50deba0b85))

## [3.0.0](https://github.com/zthun/bouncer/compare/v2.0.7...v3.0.0) (2025-10-23)

### ⚠ BREAKING CHANGES

- target is now es2020

### Build System

- target is now es2020 ([c86ad22](https://github.com/zthun/bouncer/commit/c86ad220a516eb01676c99a0c976da520ea7d857))

## [2.0.7](https://github.com/zthun/bouncer/compare/v2.0.6...v2.0.7) (2025-10-19)

**Note:** Version bump only for package @zthun/bouncer

## [2.0.6](https://github.com/zthun/bouncer/compare/v2.0.5...v2.0.6) (2025-10-04)

**Note:** Version bump only for package @zthun/bouncer

## [2.0.5](https://github.com/zthun/bouncer/compare/v2.0.4...v2.0.5) (2025-09-09)

**Note:** Version bump only for package @zthun/bouncer

## [2.0.4](https://github.com/zthun/bouncer/compare/v2.0.3...v2.0.4) (2025-09-06)

**Note:** Version bump only for package @zthun/bouncer

## [2.0.3](https://github.com/zthun/bouncer/compare/v2.0.2...v2.0.3) (2025-07-18)

**Note:** Version bump only for package @zthun/bouncer

## [2.0.2](https://github.com/zthun/bouncer/compare/v2.0.1...v2.0.2) (2025-06-22)

**Note:** Version bump only for package @zthun/bouncer

## [2.0.1](https://github.com/zthun/bouncer/compare/v2.0.0...v2.0.1) (2025-06-20)

**Note:** Version bump only for package @zthun/bouncer

## [2.0.0](https://github.com/zthun/bouncer/compare/v1.2.2...v2.0.0) (2025-06-10)

### ⚠ BREAKING CHANGES

- update module resolution to node next

### Build System

- update module resolution to node next ([7f3b18b](https://github.com/zthun/bouncer/commit/7f3b18b02927203d66e5b305adec573647472994))

## [1.2.2](https://github.com/zthun/bouncer/compare/v1.2.1...v1.2.2) (2025-05-25)

**Note:** Version bump only for package @zthun/bouncer

## [1.2.1](https://github.com/zthun/bouncer/compare/v1.2.0...v1.2.1) (2025-01-03)

**Note:** Version bump only for package @zthun/bouncer

## [1.2.0](https://github.com/zthun/bouncer/compare/v1.1.0...v1.2.0) (2025-01-03)

### Features

- generate a self signed certificate for a domain ([4d22269](https://github.com/zthun/bouncer/commit/4d22269c293c2362a72a14b77bc3150d1142d339))
- the configuration can now support bind on host and port ([7c44bfa](https://github.com/zthun/bouncer/commit/7c44bfa7863da58490b681416aab336556c25f52))

### Bug Fixes

- domain paths should be in the paths property ([9e20ac5](https://github.com/zthun/bouncer/commit/9e20ac5e1f50a5e61fd079da3f12a9a3b134a31c))
- search strategy should be project ([11d6fb2](https://github.com/zthun/bouncer/commit/11d6fb275953ea4255451c58c8262c08fc69be46))

## 1.1.0 (2024-11-18)

### Features

- bouncer initial files ([26179f6](https://github.com/zthun/bouncer/commit/26179f6d074f4c3c61b44ea1be10a85790290170))
