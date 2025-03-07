class Admin::LndPaymentsController < Admin2Controller
    def request_payment
      amount = params[:amount].to_i
      amount = amount > 0 ? amount : 10000
  
      invoice_service = RequestInvoicePaymentService.new(customer_id: current_user.customer_id, amount: amount).call
  
      unless invoice_service.success?
        render_error('There was a problem requesting an invoice, please try again later')
  
        return
      end
  
      lightning_transaction = invoice_service.lightning_transaction
  
      locals = {
        payment_amount: amount,
        payment_request: lightning_transaction.payment_request,
        payment_id: lightning_transaction.id
      }
  
      render turbo_stream: turbo_stream.replace("lnd_payment", partial: "/admin/lnd_payments/request", locals: locals), content_type: "text/vnd.turbo-stream.html"
    end
  
    def check
      lightning_transactions = LightningTransaction.by_customer(current_user.customer_id).where(status: LightningTransaction.statuses[:unpaid]).last(5)
      lightning_transactions.each do |lt|
        FindInvoicePaymentService.new(current_user: current_user, payment_hash: lt.payment_hash).call
      end
  
      head :ok
    end
  end
  