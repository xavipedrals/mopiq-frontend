Personal topic icons match the iOS PersonalDeckTopicCatalog and reuse its exact
bundled SVG vectors, tinted to match their iOS catalog colors. Psychology (brain), Engineering (cog), and Economy
(chart-no-axes-combined) use Lucide under the ISC license in
LucideIcons-LICENSE.txt. Business (briefcase) and Finance (report-money) use
Tabler under the MIT license in tabler/LICENSE.txt.

The personal catalog uses stable string keys. These keys must never be added to
the legacy numeric/APKG or public Postgres topic enums. Account choices sync via
the existing library organization RPCs using the local/Firebase deck ID.
