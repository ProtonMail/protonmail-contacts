import React, { useEffect, useState, useCallback } from 'react';
import {
    DropdownActions,
    ConfirmModal,
    Alert,
    useContactGroups,
    useContactEmails,
    useNotifications,
    useModals,
    useApi,
    useEventManager,
    OrderableTable,
    OrderableTableHeader,
    OrderableTableBody,
    OrderableTableRow,
    ContactGroupModal,
    ContactGroupIcon,
    ErrorButton,
} from 'react-components';
import { c, msgid } from 'ttag';
import { deleteLabel, orderContactGroup } from 'proton-shared/lib/api/labels';
import { move } from 'proton-shared/lib/helpers/array';
import { ContactEmail } from 'proton-shared/lib/interfaces/contacts';

const ContactGroupsTable = () => {
    const [contactGroups] = useContactGroups();
    const [contactEmails] = useContactEmails() as [ContactEmail[], boolean, any];
    const { createNotification } = useNotifications();
    const { createModal } = useModals();
    const api = useApi();
    const { call } = useEventManager();

    const [list = [], setContactGroups] = useState(contactGroups);

    useEffect(() => {
        if (!contactGroups) {
            return;
        }
        setContactGroups(contactGroups);
    }, [contactGroups]);

    const handleConfirmDeletion = (ID: string) => async () => {
        await api(deleteLabel(ID));
        await call();
        createNotification({
            text: c('Contact group notification').t`Contact group removed`,
        });
    };

    const handleSortEnd = useCallback(
        async ({ oldIndex, newIndex }) => {
            try {
                const newList = move(list, oldIndex, newIndex);
                setContactGroups(newList);
                await api(orderContactGroup({ LabelIDs: newList.map(({ ID }) => ID) }));
                void call();
            } catch (error) {
                setContactGroups(contactGroups);
            }
        },
        [list, contactGroups]
    );

    const header = [c('Table header').t`Name`, c('Table header').t`Group size`, c('Table header').t`Actions`];

    return (
        <OrderableTable className="no-border simple-table--has-actions" onSortEnd={handleSortEnd}>
            <OrderableTableHeader cells={header} />
            <OrderableTableBody colSpan={1}>
                {list.map(({ ID, Name, Color }, index) => {
                    const countEmailAddresses = (contactEmails || []).filter(({ LabelIDs = [] }) =>
                        LabelIDs.includes(ID)
                    ).length;
                    const list = [
                        {
                            text: c('Action').t`Edit`,
                            onClick() {
                                createModal(<ContactGroupModal contactGroupID={ID} selectedContactEmails={[]} />);
                            },
                        },
                        {
                            text: c('Action').t`Delete`,
                            actionType: 'delete' as 'delete',
                            onClick() {
                                createModal(
                                    <ConfirmModal
                                        title={c('Title').t`Delete ${Name}`}
                                        onConfirm={handleConfirmDeletion(ID)}
                                        confirm={<ErrorButton type="submit">{c('Action').t`Delete`}</ErrorButton>}
                                    >
                                        <Alert type="info">
                                            {c('Info')
                                                .t`Please note that addresses assigned to this group will NOT be deleted.`}
                                        </Alert>
                                        <Alert type="error">
                                            {c('Info')
                                                .t`Are you sure you want to permanently delete this contact group?`}
                                        </Alert>
                                    </ConfirmModal>
                                );
                            },
                        },
                    ];
                    const cells = [
                        <div key={ID} className="flex flex-align-items-center flex-nowrap">
                            <span className="flex-item-noshrink mr0-5">
                                {/* TODO: Fix ContactGroupIcon typing */}
                                {/* @ts-ignore */}
                                <ContactGroupIcon className="flex" name={Name} color={Color} />
                            </span>
                            <span className="text-ellipsis">{Name}</span>
                        </div>,
                        c('Info').ngettext(
                            msgid`${countEmailAddresses} email address`,
                            `${countEmailAddresses} email addresses`,
                            countEmailAddresses
                        ),
                        <DropdownActions key={ID} size="small" list={list} />,
                    ];
                    return <OrderableTableRow key={ID} index={index} cells={cells} />;
                })}
            </OrderableTableBody>
        </OrderableTable>
    );
};

export default ContactGroupsTable;
