import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { getSettings, listLeads } from "@/lib/db";
import AdminSettingsForm from "@/app/components/AdminSettingsForm";

export default async function AdminPage() {
  const authed = await isAdminAuthed();
  if (!authed) {
    redirect("/admin/login");
  }

  const [settings, leads] = await Promise.all([getSettings(), listLeads()]);

  return (
    <main className="grid" style={{ gap: 18 }}>
      <section className="card">
        <div className="header">
          <div>
            <h1>Steelhead Quick Estimate Admin</h1>
            <p className="muted">Update labor rates, unit costs, production rates, multipliers, and minimum charges.</p>
          </div>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="secondary">
              Logout
            </button>
          </form>
        </div>
        <AdminSettingsForm initialSettings={settings} />
      </section>

      <section className="card">
        <div className="header">
          <div>
            <h2>Recent Leads</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Stored in your configured database.
            </p>
          </div>
          <a href="/api/admin/leads/export" className="muted">
            Export CSV
          </a>
        </div>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">ID</th>
                <th align="left">Created</th>
                <th align="left">Name</th>
                <th align="left">Phone</th>
                <th align="left">Email</th>
                <th align="left">ZIP</th>
                <th align="left">Project</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link href={`/admin/leads/${lead.id}`} prefetch={false}>
                      {lead.id}
                    </Link>
                  </td>
                  <td>{lead.created_at}</td>
                  <td>
                    <Link href={`/admin/leads/${lead.id}`} prefetch={false}>
                      {lead.name}
                    </Link>
                  </td>
                  <td>{lead.phone}</td>
                  <td>{lead.email}</td>
                  <td>{lead.zip}</td>
                  <td>{lead.project_type}</td>
                </tr>
              ))}
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ paddingTop: 12 }}>
                    No leads yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
