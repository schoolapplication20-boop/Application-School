import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../hooks/useToast';
import * as productService from '../../services/productService';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import CategoryModal from './CategoryModal';
import ProductModal from './ProductModal';
import { formatCurrency } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/errors';

const PAGE_SIZE = 20;

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'All products' },
  { value: 'true', label: 'Available' },
  { value: 'false', label: 'Unavailable' },
];

const ProductsPage = () => {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [availability, setAvailability] = useState('');
  const [categoryModal, setCategoryModal] = useState(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  const {
    data: categoriesData, loading: categoriesLoading, refetch: refetchCategories,
  } = useFetch(() => productService.listCategories(), []);
  const categories = categoriesData?.categories || [];

  const {
    data: productsData, loading: productsLoading, refetch: refetchProducts,
  } = useFetch(
    () => productService.listProducts({
      page, limit: PAGE_SIZE, category_id: categoryId || undefined, is_available: availability || undefined,
    }),
    [page, categoryId, availability],
  );
  const products = productsData?.products || [];
  const pagination = productsData?.pagination;

  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...categories.map((category) => ({ value: category.category_id, label: category.category_name })),
  ];

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Delete category "${category.category_name}"? Products in this category will be uncategorized.`)) return;

    try {
      await productService.deleteCategory(category.category_id);
      toast.success('Category deleted');
      refetchCategories();
      refetchProducts();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to delete category'));
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.product_name}"? This cannot be undone.`)) return;

    try {
      await productService.deleteProduct(product.product_id);
      toast.success('Product deleted');
      refetchProducts();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to delete product'));
    }
  };

  const columns = [
    { key: 'product_name', header: 'Product' },
    {
      key: 'category_id',
      header: 'Category',
      render: (row) => categories.find((category) => category.category_id === row.category_id)?.category_name || '-',
    },
    { key: 'price', header: 'Price', render: (row) => formatCurrency(row.price) },
    { key: 'stock_quantity', header: 'Stock', render: (row) => (row.stock_quantity ?? '-') },
    {
      key: 'is_available',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.is_available ? 'success' : 'default'}>{row.is_available ? 'Available' : 'Unavailable'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-sm">
          <Button size="sm" variant="outline" onClick={() => { setEditingProductId(row.product_id); setProductModalOpen(true); }}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteProduct(row)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Menu & Products</h2>
        <Button onClick={() => { setEditingProductId(null); setProductModalOpen(true); }}>Add product</Button>
      </div>

      <div className="card section-card mb-lg">
        <div className="flex-between">
          <h3>Categories</h3>
          <Button size="sm" variant="outline" onClick={() => setCategoryModal('new')}>Add category</Button>
        </div>
        {!categoriesLoading && categories.length === 0 && (
          <p className="text-muted">No categories yet. Add one to organize your menu.</p>
        )}
        <div className="category-list">
          {categories.map((category) => (
            <div className="category-item" key={category.category_id}>
              <span>{category.category_name}</span>
              <div className="flex gap-sm">
                <Button size="sm" variant="outline" onClick={() => setCategoryModal(category)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => handleDeleteCategory(category)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="filter-bar">
        <Select
          label="Category"
          value={categoryId}
          onChange={(event) => { setPage(1); setCategoryId(event.target.value); }}
          options={categoryOptions}
        />
        <Select
          label="Availability"
          value={availability}
          onChange={(event) => { setPage(1); setAvailability(event.target.value); }}
          options={AVAILABILITY_OPTIONS}
        />
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={products}
          loading={productsLoading}
          getRowKey={(row) => row.product_id}
          emptyMessage="No products found"
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

      {categoryModal && (
        <CategoryModal
          category={categoryModal === 'new' ? null : categoryModal}
          onClose={() => setCategoryModal(null)}
          onSaved={() => { setCategoryModal(null); refetchCategories(); }}
        />
      )}

      {productModalOpen && (
        <ProductModal
          productId={editingProductId}
          categories={categories}
          onClose={() => setProductModalOpen(false)}
          onSaved={() => { setProductModalOpen(false); refetchProducts(); }}
        />
      )}
    </div>
  );
};

export default ProductsPage;
