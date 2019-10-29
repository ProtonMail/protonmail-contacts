import React from 'react';
import PropTypes from 'prop-types';
import { OrderableHandle, Icon, Field, DropdownActions, useModals } from 'react-components';
import { c } from 'ttag';

import { clearType, getType } from '../helpers/property';
import ContactFieldProperty from './ContactFieldProperty';
import ContactModalLabel from './ContactModalLabel';
import ContactImageModal from './ContactImageModal';

const ContactModalRow = ({ property, onChange, onRemove, isOrderable = false }) => {
    const { createModal } = useModals();
    const { field, uid, value } = property;
    const type = clearType(getType(property.type));
    const canDelete = !['fn'].includes(field);
    const canClear = ['photo', 'logo'].includes(field) && property.value;
    const canEdit = ['photo', 'logo'].includes(field) && !!value;

    const handleChangeImage = () => {
        const handleSubmit = (value) => onChange({ uid, value });
        createModal(<ContactImageModal url={property.value} onSubmit={handleSubmit} />);
    };

    const list = [
        canEdit && {
            text: c('Action').t`Edit`,
            onClick: handleChangeImage
        },
        canClear && {
            text: c('Action').t`Clear`,
            onClick() {
                onChange({ uid, value: '' });
            }
        },
        canDelete && {
            text: c('Action').t`Delete`,
            onClick() {
                onRemove(property.uid);
            }
        }
    ].filter(Boolean);

    return (
        <div className="flex flex-nowrap flex-item-noshrink">
            {isOrderable ? (
                <OrderableHandle key="icon">
                    <div className="cursor-row-resize mr0-5 flex flex-item-noshrink mt1r">
                        <Icon name="text-justify" />
                    </div>
                </OrderableHandle>
            ) : (
                <div className="mr0-5 flex flex-items-center flex-item-noshrink">
                    <Icon name="text-justify nonvisible" />
                </div>
            )}
            <div className="flex flex-nowrap onmobile-flex-column w95">
                <span className="w30 flex flex-nowrap mr1 mb1">
                    <ContactModalLabel field={field} type={type} uid={property.uid} onChange={onChange} />
                </span>
                <span className="w50 mr1 mb1">
                    <Field>
                        <ContactFieldProperty
                            field={field}
                            value={property.value}
                            uid={property.uid}
                            onChange={onChange}
                            onChangeImage={handleChangeImage}
                        />
                    </Field>
                </span>
                <span className="w20 mb1">
                    {list.length > 0 && (
                        <div className="flex flex-item-noshrink flex-items-start">
                            <DropdownActions list={list} />
                        </div>
                    )}
                </span>
            </div>
        </div>
    );
};

ContactModalRow.propTypes = {
    property: PropTypes.object.isRequired,
    onChange: PropTypes.func,
    onAdd: PropTypes.func,
    onRemove: PropTypes.func,
    isOrderable: PropTypes.bool
};

export default ContactModalRow;
