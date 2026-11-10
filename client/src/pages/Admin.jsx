import { useEffect, useState, useCallback } from 'react';
import { api, cap } from '../api';
import { useToast } from '../App.jsx';

// Admin console — review reports, suspend or reinstate accounts (FR-16)
export default function Admin() {
  const [reports, setReports] = useState(null);
  const [stats, setStats] = useState(null);
  const toast = useToast();
  const load = useCallback(() => {
    api('/admin/reports').then((d) => setReports(d.reports));
    api('/admin/stats').then(setStats);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (id, action) => {
    try {
      await api(`/admin/reports/${id}`, { method: 'POST', body: { action } });
      toast(action === 'suspend' ? 'Account suspended' : action === 'reinstate' ? 'Account reinstated' : 'Report dismissed');
      load();
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  return (
    <>
      <h1>Admin console</h1>
      {stats && (
        <div className="kpis">
          <div className="card kpi">
            <b>{stats.users}</b>
            <span>members</span>
          </div>
          <div className="card kpi">
            <b>{stats.requests}</b>
            <span>exchange requests</span>
          </div>
          <div className="card kpi">
            <b>{stats.openReports}</b>
            <span>open reports</span>
          </div>
        </div>
      )}
      <h2>Reported members</h2>
      {reports && reports.length === 0 && <div className="card empty">No reports.</div>}
      <div className="table-wrap card">
        {reports && reports.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Reported</th>
                <th>By</th>
                <th>Reason</th>
                <th>Report</th>
                <th>Account</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r._id}>
                  <td>
                    <b>{r.reported?.name}</b>
                    <br />
                    <small className="muted">{r.reported?.email}</small>
                  </td>
                  <td>{r.reporter?.name}</td>
                  <td className="reason">{r.reason}</td>
                  <td>
                    <span className={`status ${r.status}`}>{cap(r.status)}</span>
                  </td>
                  <td>
                    <span className={`status ${r.reported?.status}`}>{cap(r.reported?.status)}</span>
                  </td>
                  <td className="nowrap">
                    {r.reported?.status === 'active' ? (
                      <button className="btn danger sm" onClick={() => act(r._id, 'suspend')}>
                        Suspend
                      </button>
                    ) : (
                      <button className="btn ghost sm" onClick={() => act(r._id, 'reinstate')}>
                        Reinstate
                      </button>
                    )}
                    {r.status === 'open' && (
                      <button className="btn ghost sm" onClick={() => act(r._id, 'dismiss')}>
                        Dismiss
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
