import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { c, msgid } from 'ttag';
import { Route, Switch, withRouter } from 'react-router-dom';
import {
    Alert,
    Loader,
    useContactEmails,
    useContacts,
    useUser,
    useUserKeys,
    useApi,
    useNotifications,
    useEventManager,
    useContactGroups,
    useActiveBreakpoint,
    useModals,
    ConfirmModal,
    ErrorButton,
    useToggle
} from 'react-components';
import { clearContacts, deleteContacts } from 'proton-shared/lib/api/contacts';
import { normalize } from 'proton-shared/lib/helpers/string';
import { toMap } from 'proton-shared/lib/helpers/object';
import { isMobile as isItMobile, isDesktop as isItDesktop } from 'proton-shared/lib/helpers/responsive';
import { extractMergeable } from '../helpers/merge';

import ContactsList from '../components/ContactsList';
import Contact from '../components/Contact';
import ContactPlaceholder from '../components/ContactPlaceholder';
import ContactToolbar from '../components/ContactToolbar';
import PrivateHeader from '../content/PrivateHeader';
import PrivateSidebar from '../content/PrivateSidebar';
import MergeModal from '../components/merge/MergeModal';
import ImportModal from '../components/import/ImportModal';
import ExportModal from '../components/ExportModal';
import PrivateLayout from '../content/PrivateLayout';

const ContactsContainer = ({ location, history }) => {
    const { state: expanded, toggle: onToggleExpand } = useToggle();
    const { createModal } = useModals();
    const [search, updateSearch] = useState('');
    const normalizedSearch = normalize(search);
    const api = useApi();
    const { createNotification } = useNotifications();
    const { call } = useEventManager();
    const [checkAll, setCheckAll] = useState(false);
    const [contactEmails, loadingContactEmails] = useContactEmails();
    const [contacts, loadingContacts] = useContacts();
    const [contactGroups, loadingContactGroups] = useContactGroups();
    const [checkedContacts, setCheckedContacts] = useState(Object.create(null));
    const [user] = useUser();
    const [userKeysList, loadingUserKeys] = useUserKeys(user);

    const breakpoint = useActiveBreakpoint();
    const isMobile = isItMobile(breakpoint);
    const isDesktop = isItDesktop(breakpoint);
    const noHeader = isMobile ? '--noHeader' : '';

    const contactGroupID = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('contactGroupID');
    }, [location.search]);

    const hasChecked = useMemo(() => {
        return Object.keys(checkedContacts).some((key) => checkedContacts[key]);
    }, [checkedContacts]);

    const filteredContacts = useMemo(() => {
        if (!Array.isArray(contacts)) {
            return [];
        }
        return contacts.filter(({ Name, Email, LabelIDs }) => {
            const searchFilter = normalizedSearch.length
                ? normalize(`${Name} ${Email}`).includes(normalizedSearch)
                : true;

            const groupFilter = contactGroupID ? LabelIDs.includes(contactGroupID) : true;

            return searchFilter && groupFilter;
        });
    }, [contacts, contactGroupID, normalizedSearch]);

    const contactEmailsMap = useMemo(() => {
        if (!Array.isArray(contactEmails)) {
            return {};
        }
        return contactEmails.reduce((acc, contactEmail) => {
            const { ContactID } = contactEmail;
            if (!acc[ContactID]) {
                acc[ContactID] = [];
            }
            acc[ContactID].push(contactEmail);
            return acc;
        }, Object.create(null));
    }, [contactEmails]);

    const contactGroupsMap = useMemo(() => toMap(contactGroups && contactGroups.filter(Boolean)), [contactGroups]);

    const formattedContacts = useMemo(() => {
        return filteredContacts.map((contact) => {
            const { ID } = contact;
            return {
                ...contact,
                emails: (contactEmailsMap[ID] || []).map(({ Email }) => Email),
                isChecked: !!checkedContacts[ID]
            };
        });
    }, [filteredContacts, checkedContacts, contactEmailsMap]);

    const mergeableContacts = useMemo(() => extractMergeable(formattedContacts), [formattedContacts]);
    const canMerge = mergeableContacts.length > 0;
    const { hasPaidMail } = user;

    const checkedContactIDs = useMemo(() => {
        return Object.entries(checkedContacts).reduce((acc, [contactID, isChecked]) => {
            if (!isChecked) {
                return acc;
            }
            acc.push(contactID);
            return acc;
        }, []);
    }, [checkedContacts]);

    const getCurrentContactID = () => {
        const [, contactID] = location.pathname.split('/contacts/');
        return contactID;
    };

    const activeIDs = useMemo(() => {
        if (checkedContactIDs && checkedContactIDs.length) {
            return checkedContactIDs;
        }
        const currentContactID = getCurrentContactID();
        if (currentContactID) {
            return [currentContactID];
        }
        return [];
    }, [checkedContactIDs, location.pathname]);

    const handleDelete = async () => {
        const confirm = <ErrorButton type="submit">{c('Action').t`Delete`}</ErrorButton>;
        await new Promise((resolve, reject) => {
            createModal(
                <ConfirmModal title={c('Title').t`Delete`} onConfirm={resolve} confirm={confirm} onClose={reject}>
                    <Alert type="warning">
                        {c('Warning').ngettext(
                            msgid`This action will permanently delete the selected contact. Are you sure you want to delete this contact?`,
                            `This action will permanently delete selected contacts. Are you sure you want to delete these contacts?`,
                            activeIDs.length
                        )}
                    </Alert>
                </ConfirmModal>
            );
        });
        await api(checkAll && !contactGroupID ? clearContacts() : deleteContacts(activeIDs));
        history.replace('/contacts');
        await call();
        setCheckedContacts(Object.create(null));
        setCheckAll(false);
        createNotification({ text: c('Success').t`Contacts deleted` });
    };

    const handleCheck = (contactIDs = [], checked = false) => {
        const update = contactIDs.reduce((acc, contactID) => {
            acc[contactID] = checked;
            return acc;
        }, Object.create(null));
        setCheckedContacts({ ...checkedContacts, ...update });
        setCheckAll(checked && contactIDs.length === contacts.length);
    };

    const handleClearSearch = () => {
        updateSearch('');
    };

    const handleCheckAll = (checked = false) => {
        if (!Array.isArray(contacts)) {
            return;
        }
        handleCheck(contacts.map(({ ID }) => ID), checked);
    };

    const handleUncheckAll = () => {
        handleCheckAll(false);
    };

    const handleMerge = () => {
        const currentContactID = getCurrentContactID();
        createModal(
            <MergeModal
                contacts={mergeableContacts}
                contactID={currentContactID}
                userKeysList={userKeysList}
                hasPaidMail={!!hasPaidMail}
            />
        );
    };
    const handleImport = () => createModal(<ImportModal userKeysList={userKeysList} />);
    const handleExport = (contactGroupID) =>
        createModal(<ExportModal contactGroupID={contactGroupID} userKeysList={userKeysList} />);
    const handleGroups = () => history.push('/contacts/settings/groups');

    const isLoading = loadingContactEmails || loadingContacts || loadingUserKeys || loadingContactGroups;
    const contactsLength = contacts ? contacts.length : 0;

    return (
        <PrivateLayout>
            <Switch>
                <Route
                    path="/contacts/:contactID?"
                    render={({ match }) => {
                        if (isLoading) {
                            return <Loader />;
                        }
                        const { contactID } = match.params;
                        return (
                            <>
                                {!isMobile && (
                                    <PrivateHeader
                                        title={c('Title').t`Contacts`}
                                        expanded={expanded}
                                        onToggleExpand={onToggleExpand}
                                        search={search}
                                        onSearch={updateSearch}
                                        isMobile={isMobile}
                                    />
                                )}
                                <div className="flex flex-nowrap">
                                    <PrivateSidebar
                                        url="/contacts"
                                        history={history}
                                        user={user}
                                        expanded={expanded}
                                        onToggleExpand={onToggleExpand}
                                        totalContacts={contactsLength}
                                        contactGroups={contactGroups}
                                    />
                                    <div className={`main flex-item-fluid main-area${noHeader}`}>
                                        <ContactToolbar
                                            user={user}
                                            contactEmailsMap={contactEmailsMap}
                                            activeIDs={activeIDs}
                                            checked={checkAll}
                                            onCheck={handleCheckAll}
                                            onDelete={handleDelete}
                                            simplified={isMobile}
                                        />
                                        <div className={`main-area--withToolbar${noHeader} no-scroll flex flex-nowrap`}>
                                            {isDesktop && (
                                                <ContactsList
                                                    emptyAddressBook={!contactsLength}
                                                    contactID={contactID}
                                                    totalContacts={contactsLength}
                                                    contacts={formattedContacts}
                                                    contactGroupsMap={contactGroupsMap}
                                                    user={user}
                                                    userKeysList={userKeysList}
                                                    loadingUserKeys={loadingUserKeys}
                                                    onCheck={handleCheck}
                                                    onClear={handleClearSearch}
                                                />
                                            )}
                                            {contactsLength && contactID && !hasChecked ? (
                                                <Contact
                                                    contactID={contactID}
                                                    contactEmails={contactEmailsMap[contactID]}
                                                    contactGroupsMap={contactGroupsMap}
                                                    userKeysList={userKeysList}
                                                />
                                            ) : (
                                                <ContactPlaceholder
                                                    history={history}
                                                    user={user}
                                                    userKeysList={userKeysList}
                                                    loadingUserKeys={loadingUserKeys}
                                                    contactGroupID={contactGroupID}
                                                    contacts={formattedContacts}
                                                    totalContacts={contactsLength}
                                                    onUncheck={handleUncheckAll}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    }}
                />
                <Route
                    render={() => {
                        return (
                            <>
                                <PrivateHeader
                                    title={c('Title').t`Contacts`}
                                    expanded={expanded}
                                    onToggleExpand={onToggleExpand}
                                    search={search}
                                    onSearch={updateSearch}
                                    isMobile={isMobile}
                                />
                                <div className="flex flex-nowrap">
                                    <PrivateSidebar
                                        url="/contacts"
                                        history={history}
                                        user={user}
                                        expanded={expanded}
                                        onToggleExpand={onToggleExpand}
                                        totalContacts={contactsLength}
                                        contactGroups={contactGroups}
                                    />
                                    <div className="main flex-item-fluid main-area">
                                        <ContactToolbar
                                            user={user}
                                            contactEmailsMap={contactEmailsMap}
                                            activeIDs={activeIDs}
                                            checked={checkAll}
                                            onCheck={handleCheckAll}
                                            onDelete={handleDelete}
                                        />
                                        <div className="main-area--withToolbar no-scroll flex flex-nowrap">
                                            <ContactsList
                                                totalContacts={contactsLength}
                                                contacts={formattedContacts}
                                                contactGroupsMap={contactGroupsMap}
                                                user={user}
                                                userKeysList={userKeysList}
                                                loadingUserKeys={loadingUserKeys}
                                                onCheck={handleCheck}
                                                onClear={handleClearSearch}
                                                isDesktop={isDesktop}
                                            />
                                            {!!contactsLength && isDesktop && (
                                                <ContactPlaceholder
                                                    history={history}
                                                    user={user}
                                                    userKeysList={userKeysList}
                                                    loadingUserKeys={loadingUserKeys}
                                                    contactGroupID={contactGroupID}
                                                    totalContacts={contactsLength}
                                                    contacts={formattedContacts}
                                                    onUncheck={handleUncheckAll}
                                                    canMerge={canMerge}
                                                    onMerge={handleMerge}
                                                    onImport={handleImport}
                                                    onExport={handleExport}
                                                    onGroups={handleGroups}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    }}
                />
            </Switch>
        </PrivateLayout>
    );
};

ContactsContainer.propTypes = {
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired
};

export default withRouter(ContactsContainer);
