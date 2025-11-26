/**
 * USER TABLE COMPONENT
 * ====================
 * Reusable table for displaying guests/users
 */

Components.register('UserTable', function({
    id = 'user-table',
    emptyMessage = 'No records found'
}) {
    return `
        <div class="table-container">
            <table id="${id}">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="6" class="text-center text-muted">
                            ${SecurityUtils.escapeHtml(emptyMessage)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
});

/**
 * Helper function to populate UserTable with data
 */
window.populateUserTable = function(tableId, users) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">No records found</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${SecurityUtils.escapeHtml(user.name || user.full_name)}</strong></td>
            <td>${SecurityUtils.escapeHtml(user.email)}</td>
            <td>${SecurityUtils.escapeHtml(user.phone || user.contact_number)}</td>
            <td><span class="badge badge-info">${SecurityUtils.escapeHtml(user.category || user.guest_category || 'Regular')}</span></td>
            <td>
                ${user.attended || user.checked_in ?
                    '<span class="badge badge-success"><i class="fas fa-check"></i> Checked In</span>' :
                    '<span class="badge badge-warning"><i class="fas fa-clock"></i> Pending</span>'
                }
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="viewUserDetails('${user.id || user.guest_code}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline" onclick="editUser('${user.id || user.guest_code}')">
                    <i class="fas fa-edit"></i>
                </button>
                ${!user.attended && !user.checked_in ? `
                    <button class="btn btn-sm btn-primary" onclick="checkInUser('${user.guest_code}')">
                        <i class="fas fa-qrcode"></i> Check-In
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
};
