# Hide Prompt Attribution Metadata Design

## Goal

Hide every case whose prompt contains either `**作者**:` or `**来源**:` from public browsing without deleting or modifying the stored case, its images, tags, or favorites.

## Chosen approach

Apply a shared Prisma exclusion predicate in the case-query service. The predicate excludes a case when `prompt` contains either marker. The same predicate will be used for list results, model/category counts, direct detail lookup, and previous/next navigation.

## Why

This is reversible and has no data migration. Applying the rule in the service layer prevents the excluded records from appearing through normal list pages, count badges, legacy detail URLs, or pagination navigation.

## Error handling and verification

A direct detail URL for a hidden case will resolve as not found. A focused service test will prove that either marker causes exclusion while ordinary prompts remain available; the test will be run red before implementation and green afterward.
