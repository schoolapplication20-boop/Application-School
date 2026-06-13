import PropTypes from 'prop-types';

const Table = ({ columns, data, loading, emptyMessage, getRowKey }) => (
  <div className="table-wrapper">
    <table className="table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading && (
          <tr>
            <td className="table-loading" colSpan={columns.length}>Loading...</td>
          </tr>
        )}
        {!loading && data.length === 0 && (
          <tr>
            <td className="table-empty" colSpan={columns.length}>{emptyMessage}</td>
          </tr>
        )}
        {!loading && data.map((row) => (
          <tr key={getRowKey(row)}>
            {columns.map((column) => (
              <td key={column.key}>
                {column.render ? column.render(row) : row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

Table.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    header: PropTypes.node.isRequired,
    render: PropTypes.func,
  })).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool,
  emptyMessage: PropTypes.string,
  getRowKey: PropTypes.func,
};

Table.defaultProps = {
  loading: false,
  emptyMessage: 'No records found',
  getRowKey: (row) => row.id,
};

export default Table;
