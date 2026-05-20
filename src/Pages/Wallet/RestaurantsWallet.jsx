import React, { useState, useEffect, useMemo } from 'react';
import { getUserTransactions, creditWallet, debitWallet } from '../../Api/index';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import {
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    TrendingUp,
    TrendingDown,
    Check,
    Copy
} from 'lucide-react';

const RestaurantsWallet = () => {
    // Get userId from URL params
    const { userId } = useParams();

    // State management
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [showCopyNotification, setShowCopyNotification] = useState(false);
    const [copiedId, setCopiedId] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionType, setActionType] = useState('credit');
    const [currentBalance, setCurrentBalance] = useState(0);
    const [userProfile, setUserProfile] = useState(null);

    // Fetch transactions
    const fetchTransactions = async (page = 1, limit = 20) => {
        if (!userId) {
            setError("No user ID provided");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await getUserTransactions(userId, page, limit);

            if (result.ok) {
                // setTransactions(result.data.transactions || result.data.data || []);
                const txns = result.data.transactions || result.data.data || [];
                setTransactions(txns);
                setUserProfile(result.data.user || null);

                // SET BALANCE FROM LATEST TRANSACTION
                if (result.data.wallet?.balance !== undefined) {
                    setCurrentBalance(result.data.wallet.balance || 0);
                } else if (txns.length > 0) {
                    const latest = txns[0];
                    setCurrentBalance(latest.closingBalance || latest.currentBalance || 0);
                } else {
                    setCurrentBalance(0);
                }

                // Update pagination info
                setPagination({
                    page: result.data.page || page,
                    limit: result.data.limit || limit,
                    total: result.data.total || result.data.count || 0,
                    totalPages: result.data.totalPages || Math.ceil((result.data.total || 0) / limit)
                });
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("An unexpected error occurred");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        if (userId) {
            fetchTransactions();
        }
    }, [userId]);


    // wallet credit / debit 

    const handleWalletAction = async () => {
        if (!amount) {
            return toast.error("Enter amount");
        }
    
        //  Safe debit check using real balance
        if (actionType === 'debit' && currentBalance < Number(amount)) {
            return toast.error("Insufficient balance");
        }
    
        setActionLoading(true);
    
        const payload = {
            userId: userId,
            amount: Number(amount),
            note: note || `Admin ${actionType}`,
        };
    
        let res;
    
        try {
            res =
                actionType === 'credit'
                    ? await creditWallet(payload)
                    : await debitWallet(payload);
    
            console.log("Wallet Response:", res); // 🔍 debug once
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong");
            setActionLoading(false);
            return;
        }
    
        if (res?.ok) {
            //  NEVER undefined now
            toast.success(res.message || `Wallet ${actionType} successful`);
    
            //  Update balance instantly
            if (res.data?.balance !== undefined) {
                setCurrentBalance(res.data.balance);
            }
    
            setAmount('');
            setNote('');
    
            // refresh transactions
            fetchTransactions(pagination.page, pagination.limit);
    
        } else {
            toast.error(res?.message || "Operation failed");
        }
    
        setActionLoading(false);
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchTransactions(newPage, pagination.limit);
        }
    };

    // Handle limit change
    const handleLimitChange = (e) => {
        const newLimit = parseInt(e.target.value);
        fetchTransactions(1, newLimit);
    };

    // Handle sort
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Handle copy transaction ID
    const handleCopyId = (id) => {
        navigator.clipboard.writeText(id || '')
            .then(() => {
                setCopiedId(id);
                setShowCopyNotification(true);
                // Hide notification after 2 seconds
                setTimeout(() => {
                    setShowCopyNotification(false);
                    setCopiedId('');
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    // Format date and time separately
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            time: date.toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
        };
    };

    // Helper function to get first two words
    const getFirstTwoWords = (text) => {
        if (!text || text.trim() === '') return 'No description';
        const words = text.trim().split(/\s+/);
        if (words.length <= 2) return text;
        return `${words[0]} ${words[1]}...`;
    };

    // Get transaction type icon and color
    const getTransactionTypeInfo = (type) => {
        switch (type?.toLowerCase()) {
            case 'credit':
            case 'deposit':
            case 'topup':
                return { icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-600', bgColor: 'bg-green-50' };
            case 'debit':
            case 'withdrawal':
            case 'payment':
                return { icon: <TrendingDown className="w-4 h-4" />, color: 'text-red-600', bgColor: 'bg-red-50' };
            default:
                return { icon: <FileText className="w-4 h-4" />, color: 'text-gray-600', bgColor: 'bg-gray-50' };
        }
    };

    // Get status icon and color
    const getStatusInfo = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'success':
                return { icon: <CheckCircle className="w-3 h-3" />, color: 'bg-green-100 text-green-800' };
            case 'pending':
                return { icon: <Clock className="w-3 h-3" />, color: 'bg-yellow-100 text-yellow-800' };
            case 'failed':
            case 'declined':
                return { icon: <XCircle className="w-3 h-3" />, color: 'bg-red-100 text-red-800' };
            default:
                return { icon: <AlertCircle className="w-3 h-3" />, color: 'bg-gray-100 text-gray-800' };
        }
    };

    // Calculate total credits and debits
    const totals = useMemo(() => {
        return transactions.reduce((acc, transaction) => {
            const amount = parseFloat(transaction.amount) || 0;
            if (transaction.type?.toLowerCase() === 'credit') {
                acc.credits += amount;
            } else {
                acc.debits += amount;
            }
            return acc;
        }, { credits: 0, debits: 0 });
    }, [transactions]);

    // Filter and sort transactions
    const filteredTransactions = useMemo(() => {
        let filtered = transactions.filter(transaction => {
            const matchesSearch = searchTerm === '' ||
                transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction._id?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' ||
                transaction.status?.toLowerCase() === statusFilter.toLowerCase();

            const matchesType = typeFilter === 'all' ||
                transaction.type?.toLowerCase() === typeFilter.toLowerCase();

            return matchesSearch && matchesStatus && matchesType;
        });

        // Sort transactions
        filtered.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (sortConfig.key === 'date') {
                return sortConfig.direction === 'asc'
                    ? new Date(a.createdAt) - new Date(b.createdAt)
                    : new Date(b.createdAt) - new Date(a.createdAt);
            }

            if (sortConfig.key === 'amount') {
                return sortConfig.direction === 'asc'
                    ? (a.amount || 0) - (b.amount || 0)
                    : (b.amount || 0) - (a.amount || 0);
            }

            return 0;
        });

        return filtered;
    }, [transactions, searchTerm, statusFilter, typeFilter, sortConfig]);

    if (!userId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No User Selected</h2>
                    <p className="text-gray-600 mb-6">Please select a restaurant to view wallet transactions</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Copy Notification */}
            {showCopyNotification && (
                <div className="fixed top-6 right-6 z-50 animate-fade-in-down">
                    <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        <span>Transaction ID copied to clipboard!</span>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">User Wallet</h1>
                            <p className="text-gray-600 mt-2">Transaction history and wallet management</p>
                            {userProfile && (
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                    <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                                        {userProfile.name?.trim() || 'Unnamed user'}
                                    </span>
                                    <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                                        {userProfile.phone?.trim() || 'No phone'}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-gray-500">User ID:</span>
                                <code className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-mono">
                                    {userId}
                                </code>
                            </div>
                        </div>

                        <button
                            onClick={() => fetchTransactions(pagination.page, pagination.limit)}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>

                </div>

                {/* Wallet credit/debit */}
                {/* Wallet Action Panel */}
                <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                        {/* LEFT */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                                Wallet Actions
                            </h3>
                            <p className="text-sm text-gray-500">
                                Current Balance:
                                <span className="ml-2 font-bold text-green-600">
                                    ₹{currentBalance}
                                </span>
                            </p>
                        </div>

                        {/* RIGHT */}
                        <div className="flex flex-col md:flex-row gap-3 items-center">

                            {/* Toggle */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActionType('credit')}
                                    className={`px-4 py-2 rounded-lg ${actionType === 'credit'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-100'
                                        }`}
                                >
                                    Credit
                                </button>

                                <button
                                    onClick={() => setActionType('debit')}
                                    className={`px-4 py-2 rounded-lg ${actionType === 'debit'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-100'
                                        }`}
                                >
                                    Debit
                                </button>
                            </div>

                            {/* Inputs */}
                            <input
                                type="number"
                                placeholder="Amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="border px-3 py-2 rounded-lg w-32"
                            />

                            <input
                                type="text"
                                placeholder="Note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="border px-3 py-2 rounded-lg w-48"
                            />

                            {/* Submit */}
                            <button
                                onClick={handleWalletAction}
                                disabled={actionLoading}
                                className={`px-5 py-2 text-white rounded-lg ${actionType === 'credit'
                                        ? 'bg-green-600'
                                        : 'bg-red-600'
                                    }`}
                            >
                                {actionLoading ? "Processing..." : `Apply`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium">Error: {error}</p>
                        </div>
                        <button
                            onClick={() => fetchTransactions(pagination.page, pagination.limit)}
                            className="text-sm font-medium text-red-700 hover:text-red-900 underline"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Main Content */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Table Header with Controls */}
                    <div className="px-8 py-2 border-b border-gray-200">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800">Transaction</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Showing {filteredTransactions.length} of {pagination.total} transactions
                                </p>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 ">
                                <div className="bg-white/45 rounded-xl shadow-sm  border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xl font-bold text-green-600 px-3 ">
                                                {formatCurrency(totals.credits)}
                                            </p>
                                        </div>

                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm  border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xl font-bold text-red-600 px-3">
                                                {formatCurrency(totals.debits)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">

                                {/* Filters */}
                                <div className="flex gap-2">
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    >
                                        <option value="all">All Types</option>
                                        <option value="credit">Credit</option>
                                        <option value="debit">Debit</option>
                                    </select>

                                    {/* Items per page selector */}
                                    <div className="flex items-center">
                                        <select
                                            value={pagination.limit}
                                            onChange={handleLimitChange}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                            <option value="10">10 rows</option>
                                            <option value="20">20 rows</option>
                                            <option value="50">50 rows</option>
                                            <option value="100">100 rows</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="overflow-x-auto h-[65vh] overflow-y-auto" style={{
                        scrollbarWidth: 'none', // Firefox
                        msOverflowStyle: 'none', // IE/Edge
                    }}>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('date')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Date & Time
                                            {sortConfig.key === 'date' && (
                                                <span className="text-gray-400">
                                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th
                                        className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('amount')}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            Amount
                                            {sortConfig.key === 'amount' && (
                                                <span className="text-gray-400">
                                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Balance After
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Transaction ID
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading && transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent mb-4"></div>
                                                <p className="text-gray-600">Loading transactions...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((transaction, index) => {
                                        const formattedDateTime = formatDate(transaction.createdAt || transaction.date);
                                        const typeInfo = getTransactionTypeInfo(transaction.type);
                                        const statusInfo = getStatusInfo(transaction.status);
                                        const transactionId = transaction._id || transaction.id || '';

                                        return (
                                            <tr
                                                key={transactionId || index}
                                                className="hover:bg-gray-50 transition-colors duration-150 group"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {formattedDateTime.date}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {formattedDateTime.time}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${typeInfo.bgColor} ${typeInfo.color}`}>
                                                        {typeInfo.icon}
                                                        <span className="text-sm font-medium capitalize">
                                                            {transaction.type || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className={`inline-flex items-center gap-1 text-sm font-bold ${transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {transaction.type === 'CREDIT' ? (
                                                            <TrendingUp className="w-4 h-4" />
                                                        ) : (
                                                            <TrendingDown className="w-4 h-4" />
                                                        )}
                                                        {transaction.type === 'CREDIT' ? '+' : '-'}
                                                        {formatCurrency(transaction.amount)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                                        {statusInfo.icon}
                                                        {transaction.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-10">
                                                    <div className="relative group/desc">
                                                        <span className="text-sm text-gray-900 cursor-help truncate inline-block max-w-[200px]">
                                                            {getFirstTwoWords(transaction.description || transaction.note || 'No description')}
                                                        </span>
                                                        <div className="absolute left-0 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover/desc:opacity-100 group-hover/desc:visible transition-all duration-200 whitespace-normal max-w-xs z-50 shadow-xl">
                                                            {transaction.description || transaction.note || 'No description'}
                                                            <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900"></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {formatCurrency(transaction.closingBalance || transaction.currentBalance)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <code
                                                            className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded truncate max-w-[120px] cursor-pointer hover:bg-gray-200 transition-colors"
                                                            onClick={() => handleCopyId(transactionId)}
                                                            title="Click to copy"
                                                        >
                                                            {transactionId.substring(0, 8) || 'N/A'}
                                                        </code>
                                                        <button
                                                            onClick={() => handleCopyId(transactionId)}
                                                            className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Copy ID"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-500">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                    <FileText className="w-8 h-8 text-gray-400" />
                                                </div>
                                                <p className="text-lg font-medium text-gray-600">No transactions found</p>
                                                <p className="text-sm mt-1">
                                                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                                                        ? 'Try changing your filters or search term'
                                                        : 'Start making transactions to see them here'
                                                    }
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="text-sm text-gray-700">
                                    Showing{' '}
                                    <span className="font-medium">
                                        {(pagination.page - 1) * pagination.limit + 1}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-medium">
                                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                                    </span>{' '}
                                    of <span className="font-medium">{pagination.total}</span> transactions
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className={`inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium ${pagination.page === 1
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : 'text-gray-700 hover:bg-white border border-gray-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Previous
                                    </button>

                                    {/* Page numbers */}
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (pagination.totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (pagination.page <= 3) {
                                            pageNum = i + 1;
                                        } else if (pagination.page >= pagination.totalPages - 2) {
                                            pageNum = pagination.totalPages - 4 + i;
                                        } else {
                                            pageNum = pagination.page - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`px-3 py-2 rounded-md text-sm font-medium min-w-[40px] ${pagination.page === pageNum
                                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm'
                                                    : 'text-gray-700 hover:bg-white border border-gray-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                        className={`inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium ${pagination.page === pagination.totalPages
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : 'text-gray-700 hover:bg-white border border-gray-300 hover:shadow-sm'
                                            }`}
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading indicator for pagination */}
                    {loading && transactions.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 text-center">
                            <div className="inline-flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm text-gray-600">Loading more transactions...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
        /* Hide scrollbar for Webkit browsers */
        div[style*="scrollbar-width: none"]::-webkit-scrollbar {
          display: none !important;
        }
        
        /* Hide scrollbar for all browsers */
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hidden {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>

    );
};

export default RestaurantsWallet;
