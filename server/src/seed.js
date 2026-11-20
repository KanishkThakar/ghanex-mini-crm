const DEMO_LEADS = [
  ['Aarav Mehta', 'aarav.mehta@brightlabs.in', '+91 98200 11223', 'Bright Labs', 'Website', 'Qualified', 'Wants a demo of the analytics add-on next week.', 85000],
  ['Priya Nair', 'priya.nair@finlytics.co', '+91 99870 44556', 'Finlytics', 'LinkedIn', 'Contacted', 'Replied on LinkedIn, call booked for Friday.', 120000],
  ['Rohit Sharma', 'rohit@urbanleaf.in', '+91 90045 77881', 'Urban Leaf', 'Instagram', 'New', 'Asked for pricing in the DM.', 0],
  ['Sneha Kulkarni', 'sneha.k@medisync.io', '+91 98111 22334', 'MediSync', 'Referral', 'Converted', 'Signed the annual plan after the pilot.', 240000],
  ['Vikram Rao', 'vikram.rao@stackforge.dev', '+91 97654 32109', 'StackForge', 'Email', 'Qualified', 'Budget approved, waiting on procurement.', 150000],
  ['Ananya Iyer', 'ananya@thecraftroom.in', '+91 91234 56780', 'The Craft Room', 'Instagram', 'New', 'Small team, wants the starter plan.', 0],
  ['Karan Malhotra', 'karan@drivesure.in', '+91 98765 43210', 'DriveSure', 'Walk-in', 'Contacted', 'Visited the office, needs a proposal by Monday.', 60000],
  ['Meera Joshi', 'meera.joshi@greenbyte.co', '+91 90909 80808', 'GreenByte', 'Website', 'Converted', 'Renewed for another quarter.', 95000],
  ['Aditya Verma', 'aditya@quantnest.ai', '+91 93456 78901', 'QuantNest', 'LinkedIn', 'New', 'Downloaded the case study, no reply yet.', 0],
  ['Ishita Bose', 'ishita.bose@paperplane.in', '+91 98300 45678', 'Paperplane', 'Referral', 'Qualified', 'Wants a two-week trial before deciding.', 70000],
  ['Nikhil Pillai', 'nikhil@cloudkite.io', '+91 99456 12345', 'CloudKite', 'Email', 'Contacted', 'Asked for the security documentation.', 110000],
  ['Tara Singh', 'tara@studioarc.in', '+91 98123 45678', 'Studio Arc', 'Other', 'New', 'Met at the design meetup.', 0],
];

export function seedIfEmpty(db) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM leads').get();
  if (n > 0) return 0;

  const insert = db.prepare(
    `INSERT INTO leads (name, email, phone, company, source, status, notes, value, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const base = Date.now();
  const insertAll = db.transaction((rows) => {
    rows.forEach((row, i) => {
      // Spread the demo leads over the last few days so the list looks lived-in.
      const ts = new Date(base - i * 7 * 60 * 60 * 1000).toISOString();
      insert.run(...row, ts, ts);
    });
  });
  insertAll(DEMO_LEADS);
  return DEMO_LEADS.length;
}
