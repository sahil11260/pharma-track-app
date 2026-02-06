package com.kavyapharm.farmatrack.expense.service;

import com.kavyapharm.farmatrack.expense.dto.CreateExpenseRequest;
import com.kavyapharm.farmatrack.expense.dto.ExpenseResponse;
import com.kavyapharm.farmatrack.expense.dto.UpdateExpenseRequest;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface ExpenseService {

    ExpenseResponse createExpense(CreateExpenseRequest request);

    ExpenseResponse createExpenseWithReceipt(CreateExpenseRequest request, MultipartFile receipt) throws IOException;

    List<ExpenseResponse> getAllExpenses();

    List<ExpenseResponse> getExpensesByMr(String mrName);

    ExpenseResponse getExpenseById(Long id);

    ExpenseResponse updateExpense(Long id, UpdateExpenseRequest request);

    ExpenseResponse updateExpenseWithReceipt(Long id, UpdateExpenseRequest request, MultipartFile receipt)
            throws IOException;

    ExpenseResponse approveExpense(Long id, String approvedBy);

    ExpenseResponse rejectExpense(Long id, String rejectedBy, String reason);

    void deleteExpense(Long id);

    String uploadReceipt(MultipartFile file) throws IOException;
}
