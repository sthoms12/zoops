# Troubleshooting Intelligence Weekly

Review window: May 21, 2026 to June 20, 2026

Scope: 6 public troubleshooting investigations and outage analyses in the structured case library for this review window.

Cases reviewed:
- Cloudflare .de DNSSEC outage response (Networking, May 6, 2026)
- Microsoft Azure OpenAI multi-region latency and failures PIR (AI & Automation, May 29, 2026)
- Microsoft Azure West US 2 power and cooling PIR (Cloud Infrastructure, May 29, 2026)
- Coinbase May 7, 2026 outage postmortem (Cloud Infrastructure, June 1, 2026)
- Google Gemini outage analysis (AI & Automation, June 11, 2026)
- Meta outage analysis (Applications, June 12, 2026)

This report is generated from structured troubleshooting cases and derived troubleshooting insights. It focuses on what the investigations taught across cases rather than retelling incidents.

## Executive Summary

Across 6 structured troubleshooting cases spanning AI & Automation, Cloud Infrastructure, and Applications, the strongest investigators kept separating symptom, trigger, amplifier, and recovery bottleneck instead of locking onto the first plausible story.

The most common mistake pattern was treating recovery as proof the main diagnosis was complete. The most effective repeated technique was bounding the fault domain with comparative evidence. The evidence source that most consistently changed the direction of investigations was time-correlated telemetry across layers. The assumption that failed most often was assuming a healthy network path implies a healthy service.

## Most Common Troubleshooting Mistakes

### 1. Treating recovery as proof the main diagnosis was complete

Several cases required a second investigation thread for what was still blocking safe restoration after the trigger was addressed. Cases supporting it: 5.

- Cloudflare .de DNSSEC outage response: Broken DNSSEC signatures at the .de TLD caused validating resolvers to return SERVFAIL for fresh lookups. Cloudflare had to distinguish cached success from fresh-resolution failure, account for retry-driven traffic inflation, and decide whether to bypass DNSSEC validation temporarily to restore service.
- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.

### 2. Treating the first credible symptom as the root cause

Multiple investigations improved only after teams kept testing beyond the first plausible explanation. Cases supporting it: 4.

- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.
- Microsoft Azure West US 2 power and cooling PIR: A severe thunderstorm caused power disturbances across multiple datacenters in West US 2, triggering cooling lockouts and protective shutdowns across two physical availability zones. The hard part of the investigation was proving why recovery remained slow after cooling returned: storage validation and telemetry backlog had become the new bottlenecks.

### 3. Assuming platform resilience guarantees will hold under the real failure mode

Teams were repeatedly surprised when zonal design, managed services, or other resilience assumptions failed under stress. Cases supporting it: 3.

- Cloudflare .de DNSSEC outage response: Broken DNSSEC signatures at the .de TLD caused validating resolvers to return SERVFAIL for fresh lookups. Cloudflare had to distinguish cached success from fresh-resolution failure, account for retry-driven traffic inflation, and decide whether to bypass DNSSEC validation temporarily to restore service.
- Microsoft Azure West US 2 power and cooling PIR: A severe thunderstorm caused power disturbances across multiple datacenters in West US 2, triggering cooling lockouts and protective shutdowns across two physical availability zones. The hard part of the investigation was proving why recovery remained slow after cooling returned: storage validation and telemetry backlog had become the new bottlenecks.

### 4. Letting diagnostic surfaces mislead the investigation

Human-readable errors and top-level symptoms often pointed engineers at the wrong layer until protocol or dependency evidence overruled them. Cases supporting it: 2.

- Cloudflare .de DNSSEC outage response: Broken DNSSEC signatures at the .de TLD caused validating resolvers to return SERVFAIL for fresh lookups. Cloudflare had to distinguish cached success from fresh-resolution failure, account for retry-driven traffic inflation, and decide whether to bypass DNSSEC validation temporarily to restore service.
- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.

## Most Effective Investigation Techniques

### 1. Bounding the fault domain with comparative evidence

The strongest investigations first proved what was still healthy, which quickly shrank the search space. Cases supporting it: 5.

- Cloudflare .de DNSSEC outage response: Broken DNSSEC signatures at the .de TLD caused validating resolvers to return SERVFAIL for fresh lookups. Cloudflare had to distinguish cached success from fresh-resolution failure, account for retry-driven traffic inflation, and decide whether to bypass DNSSEC validation temporarily to restore service.
- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.

### 2. Preferring protocol-native evidence over generic status text

Protocol-level detail consistently shortened the argument over what layer was actually failing. Cases supporting it: 2.

- Cloudflare .de DNSSEC outage response: Broken DNSSEC signatures at the .de TLD caused validating resolvers to return SERVFAIL for fresh lookups. Cloudflare had to distinguish cached success from fresh-resolution failure, account for retry-driven traffic inflation, and decide whether to bypass DNSSEC validation temporarily to restore service.
- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.

### 3. Reconstructing the dependency chain end to end

Experienced troubleshooters kept following the path from trigger to customer-visible impact instead of stopping at the first failing subsystem. Cases supporting it: 2.

- Microsoft Azure West US 2 power and cooling PIR: A severe thunderstorm caused power disturbances across multiple datacenters in West US 2, triggering cooling lockouts and protective shutdowns across two physical availability zones. The hard part of the investigation was proving why recovery remained slow after cooling returned: storage validation and telemetry backlog had become the new bottlenecks.
- Coinbase May 7, 2026 outage postmortem: A severe service outage interrupted trading and most customer-facing functions. The investigation had to trace a facility event through quorum loss, Kafka leader-election problems, and staged recovery blockers rather than stopping at the first platform symptom.

### 4. Sequencing recovery by dependency criticality

The cleanest recoveries restored the minimum viable system in deliberate stages while continuing diagnosis. Cases supporting it: 2.

- Microsoft Azure West US 2 power and cooling PIR: A severe thunderstorm caused power disturbances across multiple datacenters in West US 2, triggering cooling lockouts and protective shutdowns across two physical availability zones. The hard part of the investigation was proving why recovery remained slow after cooling returned: storage validation and telemetry backlog had become the new bottlenecks.
- Coinbase May 7, 2026 outage postmortem: A severe service outage interrupted trading and most customer-facing functions. The investigation had to trace a facility event through quorum loss, Kafka leader-election problems, and staged recovery blockers rather than stopping at the first platform symptom.

### 5. Using recurrence or a second wave as fresh evidence

When the issue reappeared under a different load profile or region, the best investigators treated that as new diagnostic evidence. Cases supporting it: 2.

- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.
- Google Gemini outage analysis: ThousandEyes analyzed a Gemini degradation where the chatbot failed to reply to some users. The high-value move was proving that frontend network reachability remained healthy, which bounded the issue to backend service behavior before Google’s own attribution landed.

## Most Valuable Evidence Sources

### 1. Time-correlated telemetry across layers

Correlating multiple signals on one timeline mattered more than any single log line. Cases supporting it: 6.

- Cloudflare .de DNSSEC outage response: Broken DNSSEC signatures at the .de TLD caused validating resolvers to return SERVFAIL for fresh lookups. Cloudflare had to distinguish cached success from fresh-resolution failure, account for retry-driven traffic inflation, and decide whether to bypass DNSSEC validation temporarily to restore service.
- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.

### 2. Cross-region or cross-zone comparison

Comparing affected and unaffected regions repeatedly separated local symptoms from shared mechanisms. Cases supporting it: 5.

- Cloudflare .de DNSSEC outage response: Broken DNSSEC signatures at the .de TLD caused validating resolvers to return SERVFAIL for fresh lookups. Cloudflare had to distinguish cached success from fresh-resolution failure, account for retry-driven traffic inflation, and decide whether to bypass DNSSEC validation temporarily to restore service.
- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.

### 3. Dependency-health evidence

Quorum state, leader election, shared routing, and storage/network health had more explanatory power than user-facing error summaries. Cases supporting it: 4.

- Cloudflare .de DNSSEC outage response: Broken DNSSEC signatures at the .de TLD caused validating resolvers to return SERVFAIL for fresh lookups. Cloudflare had to distinguish cached success from fresh-resolution failure, account for retry-driven traffic inflation, and decide whether to bypass DNSSEC validation temporarily to restore service.
- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.

### 4. Rollout and change history

Change timing repeatedly helped move the investigation from symptom to trigger. Cases supporting it: 3.

- Cloudflare .de DNSSEC outage response: Broken DNSSEC signatures at the .de TLD caused validating resolvers to return SERVFAIL for fresh lookups. Cloudflare had to distinguish cached success from fresh-resolution failure, account for retry-driven traffic inflation, and decide whether to bypass DNSSEC validation temporarily to restore service.
- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.

### 5. External observation and third-party vantage points

Independent measurements were useful because they constrained the fault domain before vendor RCA was complete. Cases supporting it: 2.

- Google Gemini outage analysis: ThousandEyes analyzed a Gemini degradation where the chatbot failed to reply to some users. The high-value move was proving that frontend network reachability remained healthy, which bounded the issue to backend service behavior before Google’s own attribution landed.
- Meta outage analysis: ThousandEyes examined a broad Meta outage affecting Facebook, Messenger, WhatsApp, and later Instagram. The most valuable reasoning move was showing that frontend network reachability remained normal while application errors and timeouts rose, which excluded one major fault domain immediately.

## Most Common Incorrect Assumptions

### 1. Assuming a healthy network path implies a healthy service

Healthy transport repeatedly coexisted with application failure, so network reachability alone was not enough. Cases supporting it: 3.

- Cloudflare .de DNSSEC outage response: Broken DNSSEC signatures at the .de TLD caused validating resolvers to return SERVFAIL for fresh lookups. Cloudflare had to distinguish cached success from fresh-resolution failure, account for retry-driven traffic inflation, and decide whether to bypass DNSSEC validation temporarily to restore service.
- Google Gemini outage analysis: ThousandEyes analyzed a Gemini degradation where the chatbot failed to reply to some users. The high-value move was proving that frontend network reachability remained healthy, which bounded the issue to backend service behavior before Google’s own attribution landed.

### 2. Assuming availability zones localize most large failures

Large incidents still crossed zonal boundaries when shared dependencies or recovery paths were regional. Cases supporting it: 3.

- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.
- Microsoft Azure West US 2 power and cooling PIR: A severe thunderstorm caused power disturbances across multiple datacenters in West US 2, triggering cooling lockouts and protective shutdowns across two physical availability zones. The hard part of the investigation was proving why recovery remained slow after cooling returned: storage validation and telemetry backlog had become the new bottlenecks.

### 3. Assuming the initiator explains why recovery stays slow

Recovery bottlenecks often became a separate problem after the trigger was understood. Cases supporting it: 3.

- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.
- Microsoft Azure West US 2 power and cooling PIR: A severe thunderstorm caused power disturbances across multiple datacenters in West US 2, triggering cooling lockouts and protective shutdowns across two physical availability zones. The hard part of the investigation was proving why recovery remained slow after cooling returned: storage validation and telemetry backlog had become the new bottlenecks.

### 4. Assuming a mitigation success proves the diagnosis

Mitigations that coincided with improving conditions repeatedly created false confidence. Cases supporting it: 1.

- Microsoft Azure OpenAI multi-region latency and failures PIR: Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.

### 5. Assuming managed services will absorb the designed failure mode

Managed or shared dependencies did not always behave the way their architecture diagrams suggested. Cases supporting it: 1.

- Coinbase May 7, 2026 outage postmortem: A severe service outage interrupted trading and most customer-facing functions. The investigation had to trace a facility event through quorum loss, Kafka leader-election problems, and staged recovery blockers rather than stopping at the first platform symptom.

## Emerging Troubleshooting Patterns

### Retry storms deserve their own branch in every incident tree

Retry behavior is often an amplifier that becomes part of the incident mechanism, not just a background implementation detail. Supported by 3 cases.

Practical takeaway: Put retry telemetry on the first diagnostic dashboard. Ask who is retrying, what backoff exists, and which error classes trigger new demand.

### Shared infrastructure incidents reward teams that already know their exception policies

When a shared system fails, recovery moves faster when operators already know which emergency exceptions, bypasses, or isolation moves are acceptable. Supported by 3 cases.

Practical takeaway: Predefine emergency exception moves for shared systems: isolation, bypass, degradation, and temporary trust-model adjustments.

### Symptom relief is not proof of diagnosis

Apparent improvement after a mitigation can mask an incorrect theory when traffic, load, or other conditions change at the same time. Supported by 3 cases.

Practical takeaway: Do not mark a diagnosis confirmed just because one mitigation coincides with improvement. Look for disconfirming evidence and re-test the theory under a different load or region profile.

### The fastest way to narrow an outage is to prove what layer is still healthy

Strong investigators shrink the search space early by proving healthy layers with comparative evidence instead of staring only at the failing symptom. Supported by 3 cases.

Practical takeaway: Spend early incident time proving what is healthy. Clean paths, healthy caches, and unaffected regions are not side notes; they are search-space reducers.

### Recovery should be investigated as a separate problem from failure

The event that breaks a system is often not the same factor that makes restoration slow, unsafe, or incomplete. Supported by 2 cases.

Practical takeaway: Run two mental models in parallel: what caused the failure, and what is still preventing safe restoration.

## Case of the Week

### Microsoft Azure OpenAI multi-region latency and failures PIR

**Problem:** Azure OpenAI experienced multi-region latency and failures after an upstream API change caused retry amplification from an internal Microsoft 365 workload. The investigation initially followed a credible but wrong crash signature before a second regional wave revealed the real mechanism.

**Investigation story:**
- Detect falling success rates and correlate failures across regions and models. Azure established that the incident was broad and affected shared routing behavior.
- Inspect early crash diagnostics in the first impacted region, Australia East. Investigators formed a plausible theory around an internal feature tied to error handling.
- Disable the suspected feature. Service health improved as traffic also naturally declined, creating a false sense of confirmation.

**Key turning point:** The Sweden Central recurrence invalidated the first explanation.

**Root cause:** An upstream API-layer change caused capacity-related failures to surface as retriable server errors, creating a large retry storm from an internal Microsoft 365 workload that overwhelmed the shared Azure OpenAI routing layer.

**Lessons learned:**
- Symptom relief is not proof of diagnosis.
- Retry storms must be treated as a first-class incident mechanism.
- Recurrence under a different load profile can disprove an attractive theory quickly.

**Troubleshooting principles:**
- A convincing early theory is still provisional until it survives a second wave of evidence.
- Trigger, amplifier, and visible failure path must be separated.

## Bottom Line

The strongest reusable lesson this week is that effective troubleshooting stays comparative and evidence-led. Teams moved fastest when they used bounding the fault domain with comparative evidence, while the most repeated failure mode was treating recovery as proof the main diagnosis was complete. The assumption most in need of pressure-testing remains assuming a healthy network path implies a healthy service.

## Sources

- https://blog.cloudflare.com/de-tld-outage-dnssec/
- https://azure.status.microsoft/en-us/status/history/
- https://www.coinbase.com/blog/a-postmortem-of-our-may-7-2026-outage
- https://www.thousandeyes.com/blog/google-gemini-outage-analysis-june-10-2026
- https://www.thousandeyes.com/blog/meta-outage-analysis-june-12-2026
