<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the SynerSAT Fleet Manager. PostHog is initialized via `instrumentation-client.ts` (Next.js 15.3+ approach) with a reverse proxy configured in `next.config.ts` to route traffic through `/ingest`. User identity is resolved from the Teleport-based auth store and passed to `posthog.identify()` on app load. Events are captured across critical vessel management, command, port forwarding, and crew account workflows. Exception tracking via `posthog.captureException()` is added at key error boundaries.

| Event | Description | File |
|---|---|---|
| `user_identified` | Authenticated user identified in PostHog after auth resolves | `src/components/auth/AuthInitializer.tsx` |
| `vessel_created` | A new vessel was successfully registered in the system | `src/components/vessel/VesselFormModal.tsx` |
| `vessel_updated` | An existing vessel's information was successfully updated | `src/components/vessel/VesselFormModal.tsx` |
| `vessel_detail_viewed` | User navigated to the vessel detail page (top of vessel monitoring funnel) | `src/app/(admin)/(others-pages)/vessels/detail/page.tsx` |
| `vessel_time_range_applied` | User applied a custom time range filter on the vessel detail page | `src/app/(admin)/(others-pages)/vessels/detail/page.tsx` |
| `command_cancelled` | User cancelled a READY-state command from the vessel command table | `src/components/vessel/VesselCommandOne.tsx` |
| `command_filter_applied` | User applied a filter (type, status, or IMO) on the commands list page | `src/app/(admin)/(others-pages)/commands/page.tsx` |
| `port_forward_rule_toggled` | User toggled the enabled/disabled status of a port forward rule | `src/components/port-forward/usePortForward.ts` |
| `port_forward_rule_deleted` | User confirmed deletion of a port forward rule | `src/components/port-forward/usePortForward.ts` |
| `port_forward_rule_status_update_failed` | Port forward rule toggle failed with an error | `src/components/port-forward/usePortForward.ts` |
| `crew_topup_applied` | User successfully applied a data usage top-up for a crew account | `src/components/crew/TopUpModal.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard**: [Analytics basics](https://us.posthog.com/project/411763/dashboard/1549902)
- **Insight**: [Vessel Registrations Over Time](https://us.posthog.com/project/411763/insights/SwNxCsLD)
- **Insight**: [Vessel Viewing to Creation Funnel](https://us.posthog.com/project/411763/insights/7daQPoVP)
- **Insight**: [Port Forward Rule Changes](https://us.posthog.com/project/411763/insights/62TZXeUE)
- **Insight**: [Crew Data Top-Ups Over Time](https://us.posthog.com/project/411763/insights/bvHY0GH2)
- **Insight**: [Command Cancellations by Vessel](https://us.posthog.com/project/411763/insights/GLio9QcA)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
