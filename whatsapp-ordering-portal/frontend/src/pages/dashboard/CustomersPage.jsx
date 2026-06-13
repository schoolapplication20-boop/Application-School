import { useEffect, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as customerService from '../../services/customerService';
import Table from '../../components/ui/Table';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import CustomerDetailModal from './CustomerDetailModal';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const PAGE_SIZE = 20;

const CustomersPage = () => {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data, loading } = useFetch(
    () => customerService.listCustomers({ page, limit: PAGE_SIZE, search: search || undefined }),
    [page, search],
  );

  const customers = data?.customers || [];
  const pagination = data?.pagination;

  const columns = [
    { key: 'customer_name', header: 'Name', render: (row) => row.customer_name || '-' },
    { key: 'whatsapp_number', header: 'WhatsApp' },
    { key: 'phone_number', header: 'Phone', render: (row) => row.phone_number || '-' },
    { key: 'total_orders', header: 'Orders' },
    { key: 'total_spent', header: 'Total spent', render: (row) => formatCurrency(row.total_spent) },
    { key: 'last_order_at', header: 'Last order', render: (row) => formatDateTime(row.last_order_at) },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedCustomerId(row.customer_id)}>View</Button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Customers</h2>
      </div>

      <div className="filter-bar">
        <Input
          label="Search"
          placeholder="Name, WhatsApp or phone number"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={customers}
          loading={loading}
          getRowKey={(row) => row.customer_id}
          emptyMessage="No customers found"
        />
      </div>

      {pagination && pagination.total_pages > 1 && (
        <div className="pagination">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </Button>
          <span>
            Page
            {' '}
            {pagination.page}
            {' '}
            of
            {' '}
            {pagination.total_pages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pagination.total_pages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {selectedCustomerId && (
        <CustomerDetailModal customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />
      )}
    </div>
  );
};

export default CustomersPage;
