import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../hooks/useToast';
import * as productService from '../../services/productService';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Checkbox from '../../components/ui/Checkbox';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/errors';

const emptyForm = {
  productName: '',
  categoryId: '',
  description: '',
  price: '',
  imageUrl: '',
  isAvailable: true,
  stockQuantity: '',
  taxPercentage: '',
  preparationTimeMinutes: '',
  tags: '',
};

const toFormValues = (product) => ({
  productName: product.product_name || '',
  categoryId: product.category_id || '',
  description: product.description || '',
  price: product.price ?? '',
  imageUrl: product.image_url || '',
  isAvailable: product.is_available,
  stockQuantity: product.stock_quantity ?? '',
  taxPercentage: product.tax_percentage ?? '',
  preparationTimeMinutes: product.preparation_time_minutes ?? '',
  tags: (product.tags || []).join(', '),
});

const ProductModal = ({ productId, categories, onClose, onSaved }) => {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [addonForm, setAddonForm] = useState({ addonName: '', addonPrice: '', isRequired: false });
  const [addonError, setAddonError] = useState('');
  const [addonLoading, setAddonLoading] = useState(false);

  const { data, loading: productLoading, refetch: refetchProduct } = useFetch(
    () => (productId ? productService.getProduct(productId) : Promise.resolve(null)),
    [productId],
  );

  useEffect(() => {
    if (data?.product) {
      setForm(toFormValues(data.product));
    }
  }, [data]);

  const categoryOptions = categories.map((category) => ({ value: category.category_id, label: category.category_name }));

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const validate = () => {
    const nextErrors = {};
    const trimmedName = form.productName.trim();
    if (!trimmedName || trimmedName.length > 100) nextErrors.productName = 'Product name is required (max 100 characters)';
    if (!form.categoryId) nextErrors.categoryId = 'Select a category';
    if (form.price === '' || Number(form.price) < 0) nextErrors.price = 'Enter a valid price';
    if (form.stockQuantity !== '' && (Number(form.stockQuantity) < 0 || !Number.isInteger(Number(form.stockQuantity)))) {
      nextErrors.stockQuantity = 'Stock must be a whole number';
    }
    if (form.taxPercentage !== '' && Number(form.taxPercentage) < 0) nextErrors.taxPercentage = 'Tax must be 0 or greater';
    if (
      form.preparationTimeMinutes !== ''
      && (Number(form.preparationTimeMinutes) < 0 || !Number.isInteger(Number(form.preparationTimeMinutes)))
    ) {
      nextErrors.preparationTimeMinutes = 'Preparation time must be a whole number';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        product_name: form.productName.trim(),
        category_id: form.categoryId,
        description: form.description || undefined,
        price: Number(form.price),
        image_url: form.imageUrl || undefined,
        is_available: form.isAvailable,
        stock_quantity: form.stockQuantity === '' ? undefined : Number(form.stockQuantity),
        tax_percentage: form.taxPercentage === '' ? undefined : Number(form.taxPercentage),
        preparation_time_minutes: form.preparationTimeMinutes === '' ? undefined : Number(form.preparationTimeMinutes),
        tags: form.tags ? form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
      };

      if (productId) {
        await productService.updateProduct(productId, payload);
        toast.success('Product updated');
      } else {
        await productService.createProduct(payload);
        toast.success('Product created');
      }
      onSaved();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to save product'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddonChange = (event) => {
    const { name, value, type, checked } = event.target;
    setAddonForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddAddon = async (event) => {
    event.preventDefault();
    setAddonError('');
    const trimmedName = addonForm.addonName.trim();
    if (!trimmedName) {
      setAddonError('Add-on name is required');
      return;
    }
    if (addonForm.addonPrice === '' || Number(addonForm.addonPrice) < 0) {
      setAddonError('Enter a valid add-on price');
      return;
    }

    setAddonLoading(true);
    try {
      await productService.addAddon(productId, {
        addon_name: trimmedName,
        addon_price: Number(addonForm.addonPrice),
        is_required: addonForm.isRequired,
      });
      setAddonForm({ addonName: '', addonPrice: '', isRequired: false });
      refetchProduct();
    } catch (error) {
      setAddonError(getErrorMessage(error, 'Unable to add add-on'));
    } finally {
      setAddonLoading(false);
    }
  };

  const handleDeleteAddon = async (addon) => {
    try {
      await productService.deleteAddon(productId, addon.addon_id);
      refetchProduct();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to remove add-on'));
    }
  };

  const product = data?.product;

  return (
    <Modal
      title={productId ? 'Edit product' : 'Add product'}
      isOpen
      onClose={onClose}
      size="lg"
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>Save</Button>
        </>
      )}
    >
      {formError && <div className="form-banner form-banner-error">{formError}</div>}
      {productLoading && <p className="text-muted">Loading product...</p>}
      {!productLoading && (
        <form onSubmit={handleSubmit}>
          <Input
            label="Product name"
            name="productName"
            value={form.productName}
            onChange={handleChange}
            error={errors.productName}
            required
          />
          <Select
            label="Category"
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            error={errors.categoryId}
            options={categoryOptions}
            placeholder="Select a category"
            required
          />
          <Textarea
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            error={errors.description}
          />
          <div className="form-row">
            <Input
              label="Price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              error={errors.price}
              required
            />
            <Input
              label="Stock quantity"
              name="stockQuantity"
              type="number"
              min="0"
              step="1"
              value={form.stockQuantity}
              onChange={handleChange}
              error={errors.stockQuantity}
              hint="Leave blank if unlimited"
            />
          </div>
          <div className="form-row">
            <Input
              label="Tax percentage"
              name="taxPercentage"
              type="number"
              min="0"
              step="0.01"
              value={form.taxPercentage}
              onChange={handleChange}
              error={errors.taxPercentage}
            />
            <Input
              label="Preparation time (minutes)"
              name="preparationTimeMinutes"
              type="number"
              min="0"
              step="1"
              value={form.preparationTimeMinutes}
              onChange={handleChange}
              error={errors.preparationTimeMinutes}
            />
          </div>
          <Input
            label="Image URL"
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
            error={errors.imageUrl}
          />
          <Input
            label="Tags"
            name="tags"
            value={form.tags}
            onChange={handleChange}
            error={errors.tags}
            hint="Comma-separated, e.g. spicy, vegetarian"
          />
          <Checkbox
            label="Available for ordering"
            name="isAvailable"
            checked={form.isAvailable}
            onChange={handleChange}
          />
        </form>
      )}

      {productId && (
        <div className="addon-section">
          <h4>Add-ons</h4>
          {(product?.addons || []).length === 0 && <p className="text-muted">No add-ons yet.</p>}
          {(product?.addons || []).map((addon) => (
            <div className="addon-row" key={addon.addon_id}>
              <span>
                {addon.addon_name}
                {addon.is_required ? ' (required)' : ''}
              </span>
              <span>{formatCurrency(addon.addon_price)}</span>
              <Button size="sm" variant="danger" onClick={() => handleDeleteAddon(addon)}>Remove</Button>
            </div>
          ))}
          {addonError && <div className="form-banner form-banner-error">{addonError}</div>}
          <form className="addon-form" onSubmit={handleAddAddon}>
            <Input
              label="Add-on name"
              name="addonName"
              value={addonForm.addonName}
              onChange={handleAddonChange}
            />
            <Input
              label="Price"
              name="addonPrice"
              type="number"
              min="0"
              step="0.01"
              value={addonForm.addonPrice}
              onChange={handleAddonChange}
            />
            <Checkbox
              label="Required"
              name="isRequired"
              checked={addonForm.isRequired}
              onChange={handleAddonChange}
            />
            <Button type="submit" size="sm" loading={addonLoading}>Add</Button>
          </form>
        </div>
      )}
    </Modal>
  );
};

ProductModal.propTypes = {
  productId: PropTypes.string,
  categories: PropTypes.arrayOf(PropTypes.shape({
    category_id: PropTypes.string.isRequired,
    category_name: PropTypes.string.isRequired,
  })).isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

ProductModal.defaultProps = {
  productId: null,
};

export default ProductModal;
