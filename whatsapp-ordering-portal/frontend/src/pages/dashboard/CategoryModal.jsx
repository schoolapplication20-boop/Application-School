import { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import * as productService from '../../services/productService';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/errors';

const CategoryModal = ({ category, onClose, onSaved }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    categoryName: category?.category_name || '',
    displayOrder: category?.display_order ?? 0,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    const trimmedName = form.categoryName.trim();
    if (!trimmedName) nextErrors.categoryName = 'Category name is required';
    else if (trimmedName.length > 255) nextErrors.categoryName = 'Category name must be 255 characters or fewer';
    if (form.displayOrder !== '' && (Number(form.displayOrder) < 0 || !Number.isInteger(Number(form.displayOrder)))) {
      nextErrors.displayOrder = 'Display order must be a whole number';
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
        category_name: form.categoryName.trim(),
        display_order: form.displayOrder === '' ? 0 : Number(form.displayOrder),
      };
      if (category) {
        await productService.updateCategory(category.category_id, payload);
        toast.success('Category updated');
      } else {
        await productService.createCategory(payload);
        toast.success('Category created');
      }
      onSaved();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to save category'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={category ? 'Edit category' : 'Add category'}
      isOpen
      onClose={onClose}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>Save</Button>
        </>
      )}
    >
      {formError && <div className="form-banner form-banner-error">{formError}</div>}
      <form onSubmit={handleSubmit}>
        <Input
          label="Category name"
          name="categoryName"
          value={form.categoryName}
          onChange={handleChange}
          error={errors.categoryName}
          required
        />
        <Input
          label="Display order"
          name="displayOrder"
          type="number"
          min="0"
          step="1"
          value={form.displayOrder}
          onChange={handleChange}
          error={errors.displayOrder}
        />
      </form>
    </Modal>
  );
};

CategoryModal.propTypes = {
  category: PropTypes.shape({
    category_id: PropTypes.string,
    category_name: PropTypes.string,
    display_order: PropTypes.number,
  }),
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

CategoryModal.defaultProps = {
  category: null,
};

export default CategoryModal;
